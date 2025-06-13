const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const { Parser } = require("json2csv");

dotenv.config();
const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const BASE_URL = "https://developer.setmore.com/api/v1";

async function getAccessToken(refreshToken) {
  const res = await axios.get(
    `${BASE_URL}/oauth2/token?refreshToken=${refreshToken}`
  );
  return res.data.data.access_token;
}

async function getAllAppointments(accessToken) {
  let allAppointments = [];
  let nextCursor = null;

  do {
    const response = await axios.get(`${BASE_URL}/bookingapi/appointments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: nextCursor ? { cursor: nextCursor } : {},
    });

    const data = response.data;
    allAppointments = allAppointments.concat(data.data.appointments || []);
    nextCursor = data.data.cursor;
  } while (nextCursor);

  return allAppointments;
}

app.get("/export", async (req, res) => {
  try {
    const token = process.env.SETMORE_REFRESH_TOKEN;
    const accessToken = await getAccessToken(token);
    const appointments = await getAllAppointments(accessToken);

    const fields = [
      "staff_name",
      "customer_name",
      "service_name",
      "start_time",
      "end_time",
      "status",
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(appointments);

    res.header("Content-Type", "text/csv");
    res.attachment("appointments.csv");
    res.send(csv);
  } catch (error) {
    console.error("❌ Fehler beim Export:", error.message);
    res.status(500).send("Fehler beim Abrufen der Termine.");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
