const form = document.getElementById("leadForm");
const statusEl = document.getElementById("status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  statusEl.textContent = "Отправляем...";
  statusEl.style.color = "#0f172a";

  try {
    const response = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Ошибка отправки");
    }

    statusEl.textContent = "Заявка отправлена. Мы скоро свяжемся с вами.";
    statusEl.style.color = "#15803d";
    form.reset();
  } catch (error) {
    statusEl.textContent = "Ошибка отправки. Напишите напрямую: galolo066@gmail.com";
    statusEl.style.color = "#dc2626";
  }
});
