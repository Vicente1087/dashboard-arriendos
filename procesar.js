// Lógica compartida para leer y clasificar los datos del Google Sheet.
// Este archivo funciona TANTO en Node (lo usa actualizar-datos.js, el robot diario)
// COMO en el navegador (lo usa script.js, para el botón "Actualizar ahora").
// Por eso no usa nada específico de Node (como require) ni nada específico del
// navegador (como document) - solo JavaScript puro.

const MESES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sept: 8, sep: 8, oct: 9, nov: 10, dic: 11, dec: 11 };
const PRIMER_ANIO_CON_DATOS = 2020;

// Propiedades que a veces se pagan juntas en una sola celda del Google Sheet.
// Si tienes más casos así, avísame y los agrego aquí.
const GRUPOS_VINCULADOS = [["La Dehesa 1201, Estacionamiento 298", "La Dehesa 1201, Estacionamiento 299"]];

// Algunas celdas de "Arrendatario" en el Sheet tienen de todo pegado (nombre,
// dirección, estado civil, correo, teléfono) - acá se recorta solo a un nombre
// limpio para que la tabla no se vea gigante. No afecta si la ficha está
// completa o no, solo cómo se ve el nombre.
const CORRECCIONES_ARRENDATARIO = {
  "Estacionamiento 201 Madison (que se empieza arrendar aparte)": "Hernán Javier Peñafiel Dobud",
};

// --- Parser de CSV simple: soporta campos entre comillas con comas adentro,
// como pasa con nombres de propiedad tipo "Carmén Sylva 2315, Dpto 507". ---
function parseCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}

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

// Toma el texto crudo del CSV y devuelve { TAB_MES, TAB_ANIO, TAB_PROPIEDADES }
// `estadosManuales` es el objeto ESTADOS de contratos.js (uso interno / en
// remodelación / vacante) - las propiedades que están ahí NO son candidatas a
// "pendiente de cobranza" en la pestaña Mes, porque su falta de pago no es un
// tema de cobranza sino de otra urgencia (o directamente no aplica).
function procesarCSV(csvTexto, fechaReferencia, estadosManuales) {
  const ESTADOS_MANUALES = estadosManuales || {};
  const filas = parseCSV(csvTexto);
  const encabezado = filas[1];
  const idxPropiedad = 1;
  const idxArrendatario = encabezado.findIndex((c) => c.trim().toLowerCase() === "arrendatario");
  const idxGarantia = encabezado.findIndex((c) => c.trim().toLowerCase() === "garantia");

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

  // Algunas propiedades se pagan juntas en una sola celda (ej. dos estacionamientos
  // con un solo pago) - si cualquiera del grupo tiene un monto, las demás no
  // deberían aparecer como pendientes ese mes (el monto ya quedó contado una vez).
  const nombresFilas = filasDatos.map((f) => f[idxPropiedad].trim());
  function aplicarGruposVinculados(clasificacion) {
    for (const grupo of GRUPOS_VINCULADOS) {
      const indices = grupo.map((nombre) => nombresFilas.indexOf(nombre)).filter((i) => i !== -1);
      const algunoPagado = indices.some((i) => clasificacion[i].estado === "pagado");
      if (algunoPagado) {
        for (const i of indices) {
          if (clasificacion[i].estado !== "pagado") clasificacion[i] = { estado: "pagado", renta: null };
        }
      }
    }
    return clasificacion;
  }

  function clasificarMes(clave) {
    const idx = columnasPorMes[clave];
    const base = idx === undefined ? filasDatos.map(() => ({ estado: "vacante", renta: null })) : filasDatos.map((f) => clasificarCelda(f[idx]));
    return aplicarGruposVinculados(base);
  }

  function totalMes(clave) {
    return clasificarMes(clave).reduce((s, c) => s + (c.renta || 0), 0);
  }

  function resumenDeMes(clave) {
    const clasificacion = clasificarMes(clave);
    // Solo cuentan para "pagando/pendientes" las propiedades que deberían estar
    // generando renta (no están en ESTADOS como uso interno/remodelación/vacante).
    const filasArrendadas = filasDatos
      .map((f, i) => ({ propiedad: f[idxPropiedad].trim(), estado: clasificacion[i].estado }))
      .filter((p) => !(p.propiedad in ESTADOS_MANUALES));
    const pendientes = filasArrendadas.filter((p) => p.estado === "vacante").map((p) => p.propiedad);
    const pagando = filasArrendadas.filter((p) => p.estado === "pagado").length;
    return { total: totalMes(clave), pagando, totalPropiedades: filasArrendadas.length, pendientes };
  }

  const HOY = fechaReferencia || new Date();
  const mesPasadoFecha = new Date(HOY.getFullYear(), HOY.getMonth() - 1, 1);
  const mesActualFecha = new Date(HOY.getFullYear(), HOY.getMonth(), 1);
  const claveMesPasado = claveMesAnioMes(mesPasadoFecha.getFullYear(), mesPasadoFecha.getMonth());
  const claveMesActual = claveMesAnioMes(mesActualFecha.getFullYear(), mesActualFecha.getMonth());
  const anioReferencia = mesPasadoFecha.getFullYear();
  const mesPasadoIndex0 = mesPasadoFecha.getMonth();

  const aniosPasados = [];
  for (let a = anioReferencia - 1; a >= PRIMER_ANIO_CON_DATOS; a--) aniosPasados.push(a);

  const mesAntesDelPasadoFecha = new Date(mesPasadoFecha.getFullYear(), mesPasadoFecha.getMonth() - 1, 1);
  const claveMesAntesDelPasado = claveMesAnioMes(mesAntesDelPasadoFecha.getFullYear(), mesAntesDelPasadoFecha.getMonth());

  const TAB_MES = {
    mesActual: claveMesActual,
    mesPasado: claveMesPasado,
    mesAntesDelPasado: claveMesAntesDelPasado,
    actual: resumenDeMes(claveMesActual),
    pasado: resumenDeMes(claveMesPasado),
    totalMesAntesDelPasado: totalMes(claveMesAntesDelPasado),
    totalesMismoMesAniosAnteriores: {},
  };
  for (const a of aniosPasados) {
    TAB_MES.totalesMismoMesAniosAnteriores[a] = totalMes(claveMesAnioMes(a, mesPasadoIndex0));
  }

  function totalRangoMeses(anio, desdeMes0, hastaMes0) {
    let total = 0;
    for (let m = desdeMes0; m <= hastaMes0; m++) total += totalMes(claveMesAnioMes(anio, m));
    return total;
  }

  // El año en curso siempre está incompleto - no sirve para comparar "año contra
  // año" de forma justa. Para eso usamos el último año 100% cerrado (normalmente
  // el año anterior, salvo en enero, donde el año que recién terminó ya está completo).
  const anioPasadoCompleto = mesPasadoIndex0 === 11 ? anioReferencia : anioReferencia - 1;
  const aniosCompletosAnteriores = aniosPasados.filter((a) => a !== anioPasadoCompleto && a < anioPasadoCompleto);

  const TAB_ANIO = {
    anioActual: anioReferencia,
    mesesIncluidos: mesPasadoIndex0 + 1,
    acumuladoAnioActual: totalRangoMeses(anioReferencia, 0, mesPasadoIndex0),
    acumuladoMismoRangoAniosAnteriores: {},
    anioPasado: anioPasadoCompleto,
    totalAnioPasado: totalRangoMeses(anioPasadoCompleto, 0, 11),
    totalesAnioCompleto: {},
  };
  for (const a of aniosPasados) {
    TAB_ANIO.acumuladoMismoRangoAniosAnteriores[a] = totalRangoMeses(a, 0, mesPasadoIndex0);
  }
  for (const a of [anioPasadoCompleto, ...aniosCompletosAnteriores]) {
    TAB_ANIO.totalesAnioCompleto[a] = totalRangoMeses(a, 0, 11);
  }

  // El estado de cada propiedad (arrendada/uso interno/remodelación/vacante) para
  // la pestaña Propiedades/Contratos ya NO se adivina del Sheet (daba problemas
  // con tildes, espacios y palabras nuevas) - se maneja a mano en contratos.js,
  // junto a ESTADOS. Acá solo pasamos los datos crudos que sí vienen del Sheet.
  const TAB_PROPIEDADES = filasDatos.map((f) => {
    const propiedad = f[idxPropiedad].trim();
    const arrendatarioCrudo = (f[idxArrendatario] || "").trim();
    return {
      propiedad,
      arrendatario: CORRECCIONES_ARRENDATARIO[propiedad] || arrendatarioCrudo,
      garantiaRaw: idxGarantia !== -1 ? (f[idxGarantia] || "").trim() : "",
      vencimientoContrato: "En construcción",
      montoUF: "En construcción",
    };
  });

  return { TAB_MES, TAB_ANIO, TAB_PROPIEDADES };
}

// En Node (actualizar-datos.js) esto queda disponible vía require(); en el
// navegador, este bloque se ignora y las funciones de arriba quedan globales.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { procesarCSV };
}
