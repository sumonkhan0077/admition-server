import express from "express";
import cors from "cors";
import pool from "./db.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/universities", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM universities");
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/universities/filter", async (req, res) => {
  try {
    const {
      country = "All Countries",
      degree_level = "All Degrees",
      min_fee,
      max_fee,
      user_gpa,
      user_ielts,
    } = req.query;

    let query = "SELECT * FROM universities WHERE 1=1";
    const params = [];

    if (country !== "All Countries") {
      query += " AND country = ?";
      params.push(country);
    }

    if (degree_level !== "All Degrees") {
      const dbDegree =
        degree_level === "Bachelor's"
          ? "Bachelor"
          : degree_level === "Master's"
          ? "Master"
          : degree_level;
      query += " AND degree_level = ?";
      params.push(dbDegree);
    }

    if (min_fee) {
      query += " AND tuition_fee >= ?";
      params.push(Number(min_fee));
    }

    if (max_fee) {
      query += " AND tuition_fee <= ?";
      params.push(Number(max_fee));
    }

    // Eligibility filter (optional - only if user provided scores)
    if (user_gpa) {
      query += " AND required_gpa <= ?";
      params.push(Number(user_gpa));
    }

    if (user_ielts) {
      query += " AND required_ielts <= ?";
      params.push(Number(user_ielts));
    }

    query += " ORDER BY ranking ASC";

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST route to save application
app.post("/applications", async (req, res) => {
  try {
    const {
      university_id,
      university_name,
      full_name,
      email,
      phone,
      country,
      gpa,
      ielts,
      message,
    } = req.body;

    // Basic validation
    if (!university_id || !university_name || !full_name || !email) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const query = `
      INSERT INTO applications 
      (university_id, university_name, full_name, email, phone, country, gpa, ielts, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      university_id,
      university_name,
      full_name,
      email,
      phone || null,
      country || null,
      gpa ? Number(gpa) : null,
      ielts ? Number(ielts) : null,
      message || null,
    ];

    const [result] = await pool.execute(query, params);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      application_id: result.insertId,
    });
  } catch (err) {
    console.error("Error saving application:", err);
    res.status(500).json({ error: "Failed to save application" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
