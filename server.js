const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const { Parser } = require("json2csv");

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;
const BASE_URL = "https://developer.setmore.com/api/v1";

async function getAccessToken(refreshToken) {
  const response = await axios.get(
    `${BASE_URL}/oauth2/token?refreshToken=${refreshToken}`
  );
  return response.data.data.access_token;
}

async function getAllAppointments(accessToken) {
  let allAppointments = [];
  let nextCursor = null;

  do {
    const response = await axios.get(`${BASE_URL}/bookingapi/appointments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: nextCursor ? { cursor: nextCursor } : {},
    });

    const data = response.data.data;
    allAppointments.push(...(data.appointments || []));
    nextCursor = data.cursor;
  } while (nextCursor);

  return allAppointments;
}

app.get("/", (req, res) => {
  res.send("✅ Der Server läuft – verwende `/export` für den Export.");
});

app.get("/export", async (req, res) => {
  try {
    const refreshToken = process.env.SETMORE_REFRESH_TOKEN;
    const accessToken = await getAccessToken(refreshToken);
    const appointments = await getAllAppointments(accessToken);

    const cleaned = appointments.map((appt) => ({
      staff_name: appt.staff_key,
      customer_name: `${appt.customer?.first_name || ""} ${appt.customer?.last_name || ""}`,
      service_name: appt.service_key,
      start_time: appt.start_time,
      end_time: appt.end_time,
      status: appt.label,
      email: appt.customer?.email_id,
      phone: appt.customer?.cell_phone,
    }));

    const parser = new Parser();
    const csv = parser.parse(cleaned);

    res.header("Content-Type", "text/csv");
    res.attachment("appointments.csv");
    res.send(csv);
  } catch (err) {
    console.error("❌ Fehler beim Export:", err.message);
    res.status(500).send("Fehler beim Abrufen der Daten");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
