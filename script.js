// TAB_MES, TAB_ANIO y TAB_PROPIEDADES vienen de datos.js (generado por
// actualizar-datos.js a partir del Google Sheet real). Este archivo solo pinta la página.

const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatoCLP(numero) {
  return numero.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function nombreMes(claveISO) {
  const [anio, mes] = claveISO.split("-");
  return `${MESES_LARGO[parseInt(mes, 10) - 1]} ${anio}`;
}

function formatoVariacion(actual, anterior) {
  if (!anterior) return { texto: "sin datos para comparar", clase: "" };
  const variacion = ((actual - anterior) / anterior) * 100;
  const signo = variacion >= 0 ? "+" : "";
  const clase = variacion >= 0 ? "positivo" : "negativo";
  return { texto: `${signo}${variacion.toFixed(1)}% vs. ${formatoCLP(anterior)}`, clase };
}

// Pinta una lista de barras horizontales simples (sin librerías externas).
function pintarBarras(contenedorId, items, claveActual) {
  const max = Math.max(...items.map((i) => i.valor), 1);
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = items
    .map((i) => {
      const porcentaje = Math.round((i.valor / max) * 100);
      const esActual = i.etiqueta === claveActual;
      return `
        <div class="barra-fila">
          <span>${i.etiqueta}</span>
          <div class="barra-pista"><div class="barra-relleno ${esActual ? "actual" : ""}" style="width:${porcentaje}%"></div></div>
          <span class="barra-valor">${formatoCLP(i.valor)}</span>
        </div>
      `;
    })
    .join("");
}

function pintarLista(id, propiedades) {
  const el = document.getElementById(id);
  el.innerHTML =
    propiedades.length === 0
      ? `<li class="vacio">Ninguna.</li>`
      : propiedades.map((p) => `<li>${p}</li>`).join("");
}

function pintarTabMes() {
  document.getElementById("subtitulo-mes").textContent =
    `${nombreMes(TAB_MES.mesActual)} en curso · comparando contra ${nombreMes(TAB_MES.mesPasado)} (mes cerrado)`;

  // Bloque: mes actual
  document.getElementById("titulo-mes-actual").textContent = `Mes actual: ${nombreMes(TAB_MES.mesActual)}`;
  document.getElementById("actual-total").textContent = formatoCLP(TAB_MES.actual.total);
  document.getElementById("actual-pagando").textContent = `${TAB_MES.actual.pagando} / ${TAB_MES.actual.totalPropiedades}`;
  pintarLista("actual-pendientes", TAB_MES.actual.pendientes);

  // Bloque: mes pasado
  document.getElementById("titulo-mes-pasado").textContent = `Mes pasado: ${nombreMes(TAB_MES.mesPasado)}`;
  document.getElementById("pasado-total").textContent = formatoCLP(TAB_MES.pasado.total);
  pintarLista("pasado-pendientes", TAB_MES.pasado.pendientes);

  const anioPasado = Math.max(...Object.keys(TAB_MES.totalesMismoMesAniosAnteriores).map(Number));
  const totalAnioPasado = TAB_MES.totalesMismoMesAniosAnteriores[anioPasado];
  const vsAnioPasado = formatoVariacion(TAB_MES.pasado.total, totalAnioPasado);
  const elAnioPasado = document.getElementById("pasado-vs-anio-pasado");
  elAnioPasado.textContent = vsAnioPasado.texto;
  elAnioPasado.className = `card-value ${vsAnioPasado.clase}`;

  const itemsMismoMes = Object.entries(TAB_MES.totalesMismoMesAniosAnteriores)
    .sort((a, b) => a[0] - b[0])
    .map(([anio, valor]) => ({ etiqueta: anio, valor }));
  itemsMismoMes.push({ etiqueta: TAB_MES.mesPasado.split("-")[0], valor: TAB_MES.pasado.total });
  pintarBarras("grafico-mismo-mes", itemsMismoMes, itemsMismoMes[itemsMismoMes.length - 1].etiqueta);
}

function pintarTabAnio() {
  document.getElementById("anio-label-acumulado").textContent = `Acumulado ${TAB_ANIO.anioActual} (${TAB_ANIO.mesesIncluidos} meses)`;
  document.getElementById("anio-acumulado").textContent = formatoCLP(TAB_ANIO.acumuladoAnioActual);

  const anioPasado = Math.max(...Object.keys(TAB_ANIO.acumuladoMismoRangoAniosAnteriores).map(Number));
  const vsPasado = formatoVariacion(TAB_ANIO.acumuladoAnioActual, TAB_ANIO.acumuladoMismoRangoAniosAnteriores[anioPasado]);
  const elVsPasado = document.getElementById("anio-vs-pasado");
  elVsPasado.textContent = vsPasado.texto;
  elVsPasado.className = `card-value ${vsPasado.clase}`;

  const itemsAcumulado = Object.entries(TAB_ANIO.acumuladoMismoRangoAniosAnteriores)
    .sort((a, b) => a[0] - b[0])
    .map(([anio, valor]) => ({ etiqueta: anio, valor }));
  itemsAcumulado.push({ etiqueta: String(TAB_ANIO.anioActual), valor: TAB_ANIO.acumuladoAnioActual });
  pintarBarras("grafico-acumulado-anio", itemsAcumulado, String(TAB_ANIO.anioActual));

  const itemsAnioCompleto = Object.entries(TAB_ANIO.totalesAnioCompleto)
    .sort((a, b) => a[0] - b[0])
    .map(([anio, valor]) => ({ etiqueta: anio, valor }));
  pintarBarras("grafico-anio-completo", itemsAnioCompleto, null);
}

function pintarTabPropiedades() {
  const tbody = document.getElementById("tabla-propiedades");
  tbody.innerHTML = TAB_PROPIEDADES.map(
    (p) => `
      <tr>
        <td>${p.propiedad}</td>
        <td>${p.arrendatario || "-"}</td>
        <td class="vacio">${p.vencimientoContrato}</td>
        <td class="vacio">${p.montoUF}</td>
        <td class="garantia-cruda">${p.garantiaRaw || "-"}</td>
      </tr>
    `
  ).join("");
}

function activarTabs() {
  document.querySelectorAll(".tab-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("activo"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("activo"));
      boton.classList.add("activo");
      document.getElementById(`tab-${boton.dataset.tab}`).classList.add("activo");
    });
  });
}

pintarTabMes();
pintarTabAnio();
pintarTabPropiedades();
activarTabs();
