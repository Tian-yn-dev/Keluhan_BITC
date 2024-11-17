const dbPool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const moment = require("moment-timezone"); 
const { KeluhanSelesai } = require("../controller/mailer");

class ComplaintsService {
  constructor() {
    this.saltRounds = 10;
    this.jwtSecret = "SECRET";
  }

  async getAllComplaints() {
    const SQLQuery = "SELECT * FROM keluhan";
    return dbPool.execute(SQLQuery);
  }

  async getComplaintsById(id) {
    const SQLQuery = "SELECT * FROM keluhan WHERE id = ?";
    const [rows] = await dbPool.execute(SQLQuery, [id]);

    if (rows.length === 0) {
      throw new Error("Data keluhan tidak ditemukan");
    }

    return rows[0];
  }

  async createComplaints(body) {
    const { id, name, categories, phone, email, facilities, image, isikeluhan } = body;

    // Validasi input
    if (!name || !categories || !phone || !email || !isikeluhan) {
      throw new Error("Semua field wajib diisi kecuali id dan image");
    }

    const createAt = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

    const SQLQuery = `INSERT INTO keluhan (id, name, email, categories, phone, facilities, media, assign_to, isikeluhan, status, createAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      id || null,
      name,
      email, 
      categories,
      phone,
      facilities || null,
      image || null,
      null, // assign_to
      isikeluhan,
      "Pending", // status
      createAt,
    ];

    return dbPool.execute(SQLQuery, values);
  }

  async deleteComplaints(id) {
    const complaints = await this.getComplaintsById(id);

    if (id !== id) {
      throw new Error("Anda tidak memiliki izin untuk menghapus data keluhan ini");
    }

    const SQLQuery = `DELETE FROM keluhan WHERE id = ?`;
    const [result] = await dbPool.execute(SQLQuery, [id]);

    if (result.affectedRows === 0) {
      throw new Error("Data keluhan tidak ditemukan");
    }

    return { message: "Data keluhan berhasil dihapus" };
  }

  async updateComplaints(keluhanData) {
    const SQLQuery = `UPDATE keluhan 
                     SET name=?, categories=?, phone=?, facilities=?, image=?, isikeluhan=?
                     WHERE id=?`;
    
    const values = [
      keluhanData.name,
      keluhanData.categories,
      keluhanData.phone,
      keluhanData.facilities,
      keluhanData.image,
      keluhanData.isikeluhan,
      keluhanData.id
    ];

    return dbPool.execute(SQLQuery, values);
  }

  async assignComplaints(id, assign_to) {
    const SQLQuery = `UPDATE keluhan SET assign_to = ? WHERE id = ?`;
    return dbPool.execute(SQLQuery, [assign_to, id]);
  }

  async completeComplaints(id) {
    const SQLQuery = `UPDATE keluhan SET status = 'Selesai' WHERE id = ?`;
    const [result] = await dbPool.execute(SQLQuery, [id]);
    const complaints = await this.getComplaintsById(id);
    KeluhanSelesai(complaints.email);
    return result;
  }
}

module.exports = new ComplaintsService();