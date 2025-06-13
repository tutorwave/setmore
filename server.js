const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const { Parser } = require("json2csv");

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

async function getAccessToken(refreshToken) {
  const response = await axios.get(`https://developer.setmore.com/api/v1/o/oauth2/token?refreshToken=${refreshToken}`);
  return response.data.data.access_token;
}

async function getAllAppointments(accessToken) {
  let allAppointments = [];
  let nextCursor = null;

  do {
    const url = nextCursor
      ? `https://developer.setmore.com/api/v1/bookingapi/appointments?cursor=${nextCursor}`
      : `https://developer.setmore.com/api/v1/bookingapi/appointments`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = response.data;
    if (data?.data?.appointments) {
      allAppointments = allAppointments.concat(data.data.appointments);
      nextCursor = data.data.cursor || null;
    } else {
      break;
    }
  } while (nextCursor);

  return allAppointments;
}

app.get("/export", async (req, res) => {
  try {
    const refreshToken = process.env.SETMORE_REFRESH_TOKEN;
    const accessToken = await getAccessToken(refreshToken);
    const appointments = await getAllAppointments(accessToken);

    const filtered = appointments.filter(a => a.status === "CONFIRMED");

    const fields = ["staff_name", "customer_name", "service_name", "start_time", "end_time", "status"];
    const parser = new Parser({ fields });
    const csv = parser.parse(filtered);

    res.header("Content-Type", "text/csv");
    res.attachment("appointments.csv");
    res.send(csv);
  } catch (error) {
    console.error("Fehler beim Export:", error.response?.data || error.message);
    res.status(500).send("Fehler beim Abrufen der Termine.");
  }
});

app.get("/", (req, res) => {
  res.send("✅ Setmore Exporter läuft. Verwende /export zum Download.");
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
