// Este script hace el trabajo de "back-end": descarga el Google Sheet publicado,
// lo limpia, y deja un archivo datos.js listo para que la página web (front-end)
// solo lo muestre, sin tener que lidiar con el CSV desordenado.
const { parse } = require("csv-parse/sync");
const fs = require("fs");

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBo8pYbwsHR_gER1bxky_t-v088sUKUe5fJjEQHvksTUCHIgdUdbM3OjW7j9k_7A/pub?gid=549998238&single=true&output=csv";

// La fecha de hoy nos dice cuál es el "mes cerrado" (el mes anterior completo)
// y cuál es el "mes en curso" (recién empezando, normal que esté vacío todavía).
const HOY = new Date();
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

function etiquetaMes(fecha) {
  const mes = MESES[fecha.getMonth()];
  const anio = String(fecha.getFullYear()).slice(2);
  return `${mes}-${anio}`;
}

// Algunos años del sheet usan abreviaciones en inglés (sep, dec) en vez de español
// (sept, dic) - normalizamos ambos lados antes de comparar.
function normalizarEtiqueta(texto) {
  return texto
    .trim()
    .toLowerCase()
    .replace(/^sep-/, "sept-")
    .replace(/^dec-/, "dic-");
}

const mesEnCurso = new Date(HOY.getFullYear(), HOY.getMonth(), 1);
const mesCerrado = new Date(HOY.getFullYear(), HOY.getMonth() - 1, 1);
const etiquetaMesCerrado = etiquetaMes(mesCerrado);
const etiquetaMesEnCurso = etiquetaMes(mesEnCurso);

function esNumero(texto) {
  return /^[\d.]+$/.test(texto.trim());
}

function aNumero(texto) {
  return parseInt(texto.trim().replace(/\./g, ""), 10);
}

function clasificarCelda(valor) {
  const texto = (valor || "").trim();
  if (esNumero(texto)) {
    return { estado: "pagado", renta: aNumero(texto) };
  }
  if (texto.toLowerCase() === "en uso") {
    return { estado: "uso-interno", renta: null };
  }
  // Todo lo demás (Desocupado, blanco, "se fue", comentarios de pagos atrasados, etc.)
  // lo tratamos como vacante, tal como acordamos: no queremos adivinar montos de texto libre.
  return { estado: "vacante", renta: null };
}

async function main() {
  const res = await fetch(CSV_URL);
  const csvTexto = await res.text();
  const filas = parse(csvTexto, { relax_column_count: true });

  const encabezado = filas[1]; // fila 0 es ruido, fila 1 tiene los nombres de columna
  const idxPropiedad = 1;
  const idxArrendatario = encabezado.findIndex((c) => c.trim().toLowerCase() === "arrendatario");
  const idxGarantia = encabezado.findIndex((c) => c.trim().toLowerCase() === "garantia");
  const idxMesCerrado = encabezado.findIndex((c) => normalizarEtiqueta(c) === etiquetaMesCerrado);
  const idxMesEnCurso = encabezado.findIndex((c) => normalizarEtiqueta(c) === etiquetaMesEnCurso);

  if (idxMesCerrado === -1) {
    throw new Error(`No encontré la columna del mes cerrado (${etiquetaMesCerrado}) en el sheet.`);
  }

  const propiedades = filas
    .slice(2) // las filas de datos empiezan después del encabezado
    .filter((fila) => (fila[idxPropiedad] || "").trim() !== "")
    .map((fila) => {
      const cerrado = clasificarCelda(fila[idxMesCerrado]);
      const enCurso = idxMesEnCurso !== -1 ? clasificarCelda(fila[idxMesEnCurso]) : { estado: "vacante", renta: null };
      return {
        propiedad: fila[idxPropiedad].trim(),
        arrendatario: (fila[idxArrendatario] || "").trim(),
        garantia: idxGarantia !== -1 ? (fila[idxGarantia] || "").trim() : "",
        estado: cerrado.estado,
        renta: cerrado.renta,
        estadoMesEnCurso: enCurso.estado,
        rentaMesEnCurso: enCurso.renta,
      };
    });

  const salida = `// Archivo generado automáticamente por actualizar-datos.js — no editar a mano.
// Última actualización: ${new Date().toISOString()}
const MES_CERRADO = "${etiquetaMesCerrado}";
const MES_EN_CURSO = "${etiquetaMesEnCurso}";
const propiedades = ${JSON.stringify(propiedades, null, 2)};
`;

  fs.writeFileSync("datos.js", salida);
  console.log(`Listo: ${propiedades.length} propiedades procesadas (mes cerrado: ${etiquetaMesCerrado}, mes en curso: ${etiquetaMesEnCurso}).`);
}

main().catch((err) => {
  console.error("Error actualizando datos:", err.message);
  process.exit(1);
});
