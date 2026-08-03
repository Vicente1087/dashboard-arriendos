// Robot diario (GitHub Actions): descarga el Google Sheet publicado, lo procesa
// con la lógica compartida de procesar.js, y deja un archivo datos.js como
// respaldo rápido (se muestra al instante mientras el botón "Actualizar ahora"
// trae la versión más reciente directo desde el navegador).
const fs = require("fs");
const { procesarCSV } = require("./procesar.js");

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBo8pYbwsHR_gER1bxky_t-v088sUKUe5fJjEQHvksTUCHIgdUdbM3OjW7j9k_7A/pub?gid=549998238&single=true&output=csv";

async function main() {
  const res = await fetch(CSV_URL);
  const csvTexto = await res.text();
  const { TAB_MES, TAB_ANIO, TAB_PROPIEDADES } = procesarCSV(csvTexto);

  const salida = `// Archivo generado automáticamente por actualizar-datos.js — no editar a mano.
// Última actualización: ${new Date().toISOString()}

const ULTIMA_ACTUALIZACION = "${new Date().toISOString()}";
const TAB_MES = ${JSON.stringify(TAB_MES, null, 2)};
const TAB_ANIO = ${JSON.stringify(TAB_ANIO, null, 2)};
const TAB_PROPIEDADES = ${JSON.stringify(TAB_PROPIEDADES, null, 2)};
`;

  fs.writeFileSync("datos.js", salida);
  console.log(
    `Listo. Mes actual: ${TAB_MES.mesActual} ($${TAB_MES.actual.total.toLocaleString("es-CL")}, ${TAB_MES.actual.pendientes.length} pendientes). ` +
      `Mes pasado: ${TAB_MES.mesPasado} ($${TAB_MES.pasado.total.toLocaleString("es-CL")}, ${TAB_MES.pasado.pendientes.length} pendientes).`
  );
}

main().catch((err) => {
  console.error("Error actualizando datos:", err.message);
  process.exit(1);
});
