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
  const HOY = new Date();
  const mesCerradoFecha = new Date(HOY.getFullYear(), HOY.getMonth() - 1, 1);
  const mesEnCursoFecha = new Date(HOY.getFullYear(), HOY.getMonth(), 1);
  const claveMesCerrado = claveMesAnioMes(mesCerradoFecha.getFullYear(), mesCerradoFecha.getMonth());
  const claveMesAnterior = claveMesAnioMes(mesCerradoFecha.getFullYear(), mesCerradoFecha.getMonth() - 1 < 0 ? 11 : mesCerradoFecha.getMonth() - 1);
  // (el cálculo de mes anterior con año cruzado se corrige abajo con Date real)
  const mesAnteriorFecha = new Date(mesCerradoFecha.getFullYear(), mesCerradoFecha.getMonth() - 1, 1);
  const claveMesAnteriorReal = claveMesAnioMes(mesAnteriorFecha.getFullYear(), mesAnteriorFecha.getMonth());

  const anioCerrado = mesCerradoFecha.getFullYear();
  const mesCerradoIndex0 = mesCerradoFecha.getMonth(); // 0-11

  // Años con datos en el sheet (2020 en adelante, hasta el año actual)
  const primerAnio = 2020;
  const aniosPasados = [];
  for (let a = anioCerrado - 1; a >= primerAnio; a--) aniosPasados.push(a);

  // --- TAB 1: Mes ---
  const totalMesCerrado = totalMes(claveMesCerrado);
  const totalMesAnterior = totalMes(claveMesAnteriorReal);
  const totalesMismoMesAniosAnteriores = {};
  for (const a of aniosPasados) {
    totalesMismoMesAniosAnteriores[a] = totalMes(claveMesAnioMes(a, mesCerradoIndex0));
  }

  const clasificacionMesCerrado = clasificarMes(claveMesCerrado);
  const pendientes = filasDatos
    .map((f, i) => ({ propiedad: f[idxPropiedad].trim(), estado: clasificacionMesCerrado[i].estado }))
    .filter((p) => p.estado === "vacante")
    .map((p) => p.propiedad);

  // --- TAB 2: Total año ---
  function totalRangoMeses(anio, desdeMes0, hastaMes0) {
    let total = 0;
    for (let m = desdeMes0; m <= hastaMes0; m++) total += totalMes(claveMesAnioMes(anio, m));
    return total;
  }

  const acumuladoAnioActual = totalRangoMeses(anioCerrado, 0, mesCerradoIndex0);
  const acumuladoMismoRangoAniosAnteriores = {};
  const totalesAnioCompleto = {};
  for (const a of aniosPasados) {
    acumuladoMismoRangoAniosAnteriores[a] = totalRangoMeses(a, 0, mesCerradoIndex0);
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
  mesCerrado: "${claveMesCerrado}",
  mesAnterior: "${claveMesAnteriorReal}",
  totalMesCerrado: ${totalMesCerrado},
  totalMesAnterior: ${totalMesAnterior},
  totalesMismoMesAniosAnteriores: ${JSON.stringify(totalesMismoMesAniosAnteriores, null, 2)},
  pendientes: ${JSON.stringify(pendientes, null, 2)}
};

const TAB_ANIO = {
  anioActual: ${anioCerrado},
  mesesIncluidos: ${mesCerradoIndex0 + 1},
  acumuladoAnioActual: ${acumuladoAnioActual},
  acumuladoMismoRangoAniosAnteriores: ${JSON.stringify(acumuladoMismoRangoAniosAnteriores, null, 2)},
  totalesAnioCompleto: ${JSON.stringify(totalesAnioCompleto, null, 2)}
};

const TAB_PROPIEDADES = ${JSON.stringify(propiedadesContratos, null, 2)};
`;

  fs.writeFileSync("datos.js", salida);
  console.log(`Listo. Mes cerrado: ${claveMesCerrado}. Total: ${totalMesCerrado.toLocaleString("es-CL")}. Pendientes: ${pendientes.length}.`);
}

main().catch((err) => {
  console.error("Error actualizando datos:", err.message);
  process.exit(1);
});
