// `propiedades`, `MES_CERRADO` y `MES_EN_CURSO` vienen de datos.js (generado por
// actualizar-datos.js a partir del Google Sheet real). Este archivo solo pinta la página.

const ETIQUETAS_ESTADO = {
  pagado: "Pagado",
  "uso-interno": "Uso interno",
  vacante: "Vacante / Revisar",
};

function formatoCLP(numero) {
  return numero.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function pintarTabla(datos) {
  const tbody = document.getElementById("tabla-propiedades");
  tbody.innerHTML = "";

  for (const p of datos) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.propiedad}</td>
      <td>${p.arrendatario || "-"}</td>
      <td><span class="estado estado-${p.estado}">${ETIQUETAS_ESTADO[p.estado]}</span></td>
      <td>${p.renta ? formatoCLP(p.renta) : "-"}</td>
      <td class="garantia-cruda">${p.garantia || "-"}</td>
    `;
    tbody.appendChild(fila);
  }
}

function pintarResumen(datos) {
  const pagando = datos.filter((p) => p.estado === "pagado");
  const usoInterno = datos.filter((p) => p.estado === "uso-interno");
  const vacantes = datos.filter((p) => p.estado === "vacante");
  const totalIngresos = pagando.reduce((suma, p) => suma + p.renta, 0);

  document.getElementById("total-ingresos").textContent = formatoCLP(totalIngresos);
  document.getElementById("total-pagando").textContent = `${pagando.length} / ${datos.length}`;
  document.getElementById("total-uso-interno").textContent = usoInterno.length;
  document.getElementById("total-vacantes").textContent = vacantes.length;
  document.getElementById("subtitulo-mes").textContent =
    `Mes cerrado: ${MES_CERRADO} · Mes en curso: ${MES_EN_CURSO} (recién empezando, normal que aún esté vacío)`;
}

pintarTabla(propiedades);
pintarResumen(propiedades);
