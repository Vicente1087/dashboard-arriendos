// Back-end del proyecto: descarga el Google Sheet publicado, lo limpia, y deja un
// archivo datos.js listo para que la página web (front-end) solo lo muestre.
const { parse } = require("csv-parse/sync");
const fs = require("fs");

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBo8pYbwsHR_gER1bxky_t-v088sUKUe5fJjEQHvksTUCHIgdUdbM3OjW7j9k_7A/pub?gid=549998238&single=true&output=csv";

const MESES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sept: 8, sep: 8, oct: 9, nov: 10, dic: 11, dec: 11 };

// Convierte un encabezado tipo "jul-26" o "sep-23" a una clave ordenable "2026-07".
function claveMes(encabezado) {
  const m = encabezado.trim().toLowerCase().match(/^([a-z]+)-(\d{2})$/);
  if (!m || !(m[1] in MESES)) return null;
  const mes = MESES[m[1]];
  const anio = 2000 + parseInt(m[2], 10);
  return `${anio}-${String(mes + 1).padStart(2, "0")}`;
}

function claveMesAnioMes(anio, mesIndex0) {
  return `${anio}-${String(mesIndex0 + 1).padStart(2, "0")}`;
}

// Los montos son siempre pesos chilenos enteros, pero el separador de miles varía
// (a veces punto, a veces coma, a veces nada) - los tratamos todos como separadores.
function esNumero(texto) {
  return /^[\d.,]+$/.test(texto.trim()) && /\d/.test(texto);
}

function aNumero(texto) {
  return parseInt(texto.trim().replace(/[.,]/g, ""), 10);
}

function clasificarCelda(valor) {
  const texto = (valor || "").trim();
  if (esNumero(texto)) return { estado: "pagado", renta: aNumero(texto) };
  if (texto.toLowerCase() === "en uso") return { estado: "uso-interno", renta: null };
  // Todo lo demás (Desocupado, blanco, "se fue", comentarios de pagos atrasados, etc.)
  // se trata igual: no hay un número confiable que registrar ese mes.
  return { estado: "vacante", renta: null };
}

async function main() {
  const res = await fetch(CSV_URL);
  const csvTexto = await res.text();
  const filas = parse(csvTexto, { relax_column_count: true });

  const encabezado = filas[1];
  const idxPropiedad = 1;
  const idxArrendatario = encabezado.findIndex((c) => c.trim().toLowerCase() === "arrendatario");
  const idxGarantia = encabezado.findIndex((c) => c.trim().toLowerCase() === "garantia");

  // Mapa: clave de mes ("2026-07") -> índice de columna
  const columnasPorMes = {};
  encabezado.forEach((c, i) => {
    const clave = claveMes(c);
    if (clave) columnasPorMes[clave] = i;
  });

  // La tabla de propiedades termina en la fila "Total" - todo lo que viene después
  // (transferencias, notas, la mini-tabla de totales anuales) no son propiedades.
  const filasDatos = [];
  for (let i = 2; i < filas.length; i++) {
    const propiedadTxt = (filas[i][idxPropiedad] || "").trim();
    if (propiedadTxt.toLowerCase() === "total") break;
    if (propiedadTxt !== "") filasDatos.push(filas[i]);
  }

  // Clasificación por propiedad para un mes específico (para saber pagado/uso-interno/vacante)
  function clasificarMes(clave) {
    const idx = columnasPorMes[clave];
    if (idx === undefined) return filasDatos.map(() => ({ estado: "vacante", renta: null }));
    return filasDatos.map((f) => clasificarCelda(f[idx]));
  }

  // Suma total de renta pagada en un mes (0 si el mes no existe en el sheet)
  function totalMes(clave) {
    return clasificarMes(clave).reduce((s, c) => s + (c.renta || 0), 0);
  }

  // --- Fechas de referencia ---
  // "Mes pasado" = el último mes completo y cerrado (fuente confiable para totales).
  // "Mes actual" = el mes en curso, recién empezando - normal que tenga pocos datos.
  // Esto se recalcula solo cada vez que se corre el script, así que rota automáticamente
  // el día 1 de cada mes sin tocar código.
  const HOY = new Date();
  const mesPasadoFecha = new Date(HOY.getFullYear(), HOY.getMonth() - 1, 1);
  const mesActualFecha = new Date(HOY.getFullYear(), HOY.getMonth(), 1);
  const claveMesPasado = claveMesAnioMes(mesPasadoFecha.getFullYear(), mesPasadoFecha.getMonth());
  const claveMesActual = claveMesAnioMes(mesActualFecha.getFullYear(), mesActualFecha.getMonth());

  const anioReferencia = mesPasadoFecha.getFullYear();
  const mesPasadoIndex0 = mesPasadoFecha.getMonth(); // 0-11

  // Años con datos en el sheet (2020 en adelante, hasta el año actual)
  const primerAnio = 2020;
  const aniosPasados = [];
  for (let a = anioReferencia - 1; a >= primerAnio; a--) aniosPasados.push(a);

  // Resumen reutilizable para cualquier mes: total recaudado y qué propiedades quedaron
  // sin registro (ni número, ni "En uso").
  function resumenDeMes(clave) {
    const clasificacion = clasificarMes(clave);
    const pendientes = filasDatos
      .map((f, i) => ({ propiedad: f[idxPropiedad].trim(), estado: clasificacion[i].estado }))
      .filter((p) => p.estado === "vacante")
      .map((p) => p.propiedad);
    const pagando = clasificacion.filter((c) => c.estado === "pagado").length;
    return {
      total: totalMes(clave),
      pagando,
      totalPropiedades: filasDatos.length,
      pendientes,
    };
  }

  // --- TAB 1: Mes ---
  const resumenMesActual = resumenDeMes(claveMesActual);
  const resumenMesPasado = resumenDeMes(claveMesPasado);
  const totalesMismoMesAniosAnteriores = {};
  for (const a of aniosPasados) {
    totalesMismoMesAniosAnteriores[a] = totalMes(claveMesAnioMes(a, mesPasadoIndex0));
  }

  // --- TAB 2: Total año ---
  function totalRangoMeses(anio, desdeMes0, hastaMes0) {
    let total = 0;
    for (let m = desdeMes0; m <= hastaMes0; m++) total += totalMes(claveMesAnioMes(anio, m));
    return total;
  }

  const acumuladoAnioActual = totalRangoMeses(anioReferencia, 0, mesPasadoIndex0);
  const acumuladoMismoRangoAniosAnteriores = {};
  const totalesAnioCompleto = {};
  for (const a of aniosPasados) {
    acumuladoMismoRangoAniosAnteriores[a] = totalRangoMeses(a, 0, mesPasadoIndex0);
    totalesAnioCompleto[a] = totalRangoMeses(a, 0, 11);
  }

  // --- TAB 3: Propiedades / Contratos ---
  const propiedadesContratos = filasDatos.map((f) => ({
    propiedad: f[idxPropiedad].trim(),
    arrendatario: (f[idxArrendatario] || "").trim(),
    garantiaRaw: idxGarantia !== -1 ? (f[idxGarantia] || "").trim() : "",
    vencimientoContrato: "En construcción",
    montoUF: "En construcción",
  }));

  const salida = `// Archivo generado automáticamente por actualizar-datos.js — no editar a mano.
// Última actualización: ${new Date().toISOString()}

const TAB_MES = {
  mesActual: "${claveMesActual}",
  mesPasado: "${claveMesPasado}",
  actual: ${JSON.stringify(resumenMesActual, null, 2)},
  pasado: ${JSON.stringify(resumenMesPasado, null, 2)},
  totalesMismoMesAniosAnteriores: ${JSON.stringify(totalesMismoMesAniosAnteriores, null, 2)}
};

const TAB_ANIO = {
  anioActual: ${anioReferencia},
  mesesIncluidos: ${mesPasadoIndex0 + 1},
  acumuladoAnioActual: ${acumuladoAnioActual},
  acumuladoMismoRangoAniosAnteriores: ${JSON.stringify(acumuladoMismoRangoAniosAnteriores, null, 2)},
  totalesAnioCompleto: ${JSON.stringify(totalesAnioCompleto, null, 2)}
};

const TAB_PROPIEDADES = ${JSON.stringify(propiedadesContratos, null, 2)};
`;

  fs.writeFileSync("datos.js", salida);
  console.log(
    `Listo. Mes actual: ${claveMesActual} ($${resumenMesActual.total.toLocaleString("es-CL")}, ${resumenMesActual.pendientes.length} pendientes). ` +
      `Mes pasado: ${claveMesPasado} ($${resumenMesPasado.total.toLocaleString("es-CL")}, ${resumenMesPasado.pendientes.length} pendientes).`
  );
}

main().catch((err) => {
  console.error("Error actualizando datos:", err.message);
  process.exit(1);
});
