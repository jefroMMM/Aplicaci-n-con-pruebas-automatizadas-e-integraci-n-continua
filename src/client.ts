interface ReservationResponse {
  id: string;
  roomName: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

interface ApiError {
  error?: string;
}

const reservationForm = document.querySelector<HTMLFormElement>("#reservation-form")!;
const roomNameInput = document.querySelector<HTMLInputElement>("#room-name")!;
const startsAtInput = document.querySelector<HTMLInputElement>("#starts-at")!;
const endsAtInput = document.querySelector<HTMLInputElement>("#ends-at")!;
const createResult = document.querySelector<HTMLDivElement>("#create-result")!;
const lookupForm = document.querySelector<HTMLFormElement>("#lookup-form")!;
const reservationIdInput = document.querySelector<HTMLInputElement>("#reservation-id")!;
const lookupResult = document.querySelector<HTMLDivElement>("#lookup-result")!;
const connectionPill = document.querySelector<HTMLDivElement>("#connection-status")!;
const connectionLabel = document.querySelector<HTMLSpanElement>("#connection-label")!;

function asLocalInputValue(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

const tomorrowMorning = new Date();
tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
tomorrowMorning.setHours(9, 0, 0, 0);
startsAtInput.value = asLocalInputValue(tomorrowMorning);
const tomorrowEnd = new Date(tomorrowMorning.getTime() + 60 * 60 * 1000);
endsAtInput.value = asLocalInputValue(tomorrowEnd);

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function showError(target: HTMLDivElement, message: string): void {
  const card = document.createElement("div");
  card.className = "reservation-card error";
  const title = document.createElement("h3");
  title.textContent = "No se pudo completar la solicitud";
  const detail = document.createElement("div");
  detail.className = "reservation-meta";
  detail.textContent = message;
  card.append(title, detail);
  target.replaceChildren(card);
}

function showReservation(target: HTMLDivElement, reservation: ReservationResponse): void {
  const card = document.createElement("div");
  card.className = "reservation-card";
  const title = document.createElement("h3");
  title.textContent = reservation.roomName;
  const detail = document.createElement("div");
  detail.className = "reservation-meta";
  const times = document.createElement("span");
  times.textContent = `${formatDate(reservation.startsAt)} – ${formatDate(reservation.endsAt)}`;
  const idLabel = document.createElement("span");
  idLabel.innerHTML = "<strong>UUID</strong>";
  const idValue = document.createElement("span");
  idValue.className = "uuid-copy";
  idValue.textContent = reservation.id;
  detail.append(times, idLabel, idValue);
  card.append(title, detail);
  target.replaceChildren(card);
}

async function readApiError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as ApiError;
  return payload.error ?? `La solicitud falló (${response.status})`;
}

async function checkApi(): Promise<void> {
  try {
    const response = await fetch("/health");
    if (!response.ok) throw new Error("API no disponible");
    connectionLabel.textContent = "API conectada";
  } catch {
    connectionPill.classList.add("offline");
    connectionLabel.textContent = "API sin conexión";
  }
}

reservationForm.addEventListener("submit", async (event: SubmitEvent) => {
  event.preventDefault();
  const button = reservationForm.querySelector<HTMLButtonElement>("button[type='submit']")!;
  button.disabled = true;
  button.textContent = "Guardando…";
  try {
    const response = await fetch("/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName: roomNameInput.value,
        startsAt: new Date(startsAtInput.value).toISOString(),
        endsAt: new Date(endsAtInput.value).toISOString(),
      }),
    });
    if (!response.ok) throw new Error(await readApiError(response));
    const reservation = (await response.json()) as ReservationResponse;
    showReservation(createResult, reservation);
    reservationIdInput.value = reservation.id;
    showReservation(lookupResult, reservation);
  } catch (error) {
    showError(createResult, error instanceof Error ? error.message : "Error inesperado");
  } finally {
    button.disabled = false;
    button.innerHTML = 'Confirmar reserva <span aria-hidden="true">→</span>';
  }
});

lookupForm.addEventListener("submit", async (event: SubmitEvent) => {
  event.preventDefault();
  const id = reservationIdInput.value.trim();
  try {
    const response = await fetch(`/reservations/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(await readApiError(response));
    showReservation(lookupResult, (await response.json()) as ReservationResponse);
  } catch (error) {
    showError(lookupResult, error instanceof Error ? error.message : "Error inesperado");
  }
});

void checkApi();
