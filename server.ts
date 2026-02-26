import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL || "https://bzlmwgkxhamdymrfzutb.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_lhHOqa_NPnhitYfiy6JDVw_1QZiVUUB";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = 3000;

app.use(express.json());

// Configure multer for temporary file storage before uploading to Supabase
const upload = multer({ storage: multer.memoryStorage() });

// API Routes
app.get("/api/students", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Erro ao buscar alunos" });
  }
});

app.post("/api/students", async (req, res) => {
  const { student_code, full_name, birth_date } = req.body;
  if (!student_code || !full_name || !birth_date) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const { data, error } = await supabase
      .from("students")
      .insert([{ student_code, full_name, birth_date }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        return res.status(400).json({ error: "Código de aluno já cadastrado" });
      }
      throw error;
    }
    res.status(201).json(data);
  } catch (error) {
    console.error("Error adding student:", error);
    res.status(500).json({ error: "Erro ao cadastrar aluno" });
  }
});

app.put("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  const { student_code, full_name, birth_date } = req.body;

  if (!student_code || !full_name || !birth_date) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const { data, error } = await supabase
      .from("students")
      .update({ student_code, full_name, birth_date })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "Código de aluno já cadastrado" });
      }
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ error: "Erro ao atualizar aluno" });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get files associated with the student to delete from storage
    const { data: files, error: filesError } = await supabase
      .from("student_files")
      .select("storage_path")
      .eq("student_id", id);

    if (filesError) throw filesError;

    // 2. Delete files from storage if any
    if (files && files.length > 0) {
      const paths = files.map(f => f.storage_path);
      const { error: storageError } = await supabase.storage
        .from("student-documents")
        .remove(paths);
      
      if (storageError) console.error("Error deleting files from storage:", storageError);
    }

    // 3. Explicitly delete from student_files first to avoid FK constraint issues
    // if ON DELETE CASCADE is not set in the database.
    const { error: deleteFilesError } = await supabase
      .from("student_files")
      .delete()
      .eq("student_id", id);
    
    if (deleteFilesError) throw deleteFilesError;

    // 4. Delete student
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Erro ao excluir aluno" });
  }
});

app.get("/api/students/:id/files", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("student_files")
      .select("*")
      .eq("student_id", id)
      .order("upload_date", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.post("/api/students/:id/files", upload.single("file"), async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  try {
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    const filePath = `documents/${id}/${fileName}`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("student-documents")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 2. Save metadata to database
    const { data, error: dbError } = await supabase
      .from("student_files")
      .insert([{
        student_id: id,
        filename: fileName,
        original_name: file.originalname,
        mime_type: file.mimetype,
        storage_path: filePath
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    res.status(201).json(data);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Erro ao salvar arquivo no Supabase" });
  }
});

// Route to get download URL
app.get("/api/files/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data: fileData, error: fetchError } = await supabase
      .from("student_files")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !fileData) throw new Error("Arquivo não encontrado");

    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(fileData.storage_path, 3600); // 1 hour link

    if (error) throw error;
    res.json({ url: data.signedUrl });
  } catch (error) {
    console.error("Error getting file URL:", error);
    res.status(404).json({ error: "Arquivo não encontrado" });
  }
});

app.delete("/api/files/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get file info
    const { data: fileData, error: fetchError } = await supabase
      .from("student_files")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !fileData) throw new Error("Arquivo não encontrado");

    // 2. Delete from storage
    const { error: storageError } = await supabase.storage
      .from("student-documents")
      .remove([fileData.storage_path]);

    if (storageError) throw storageError;

    // 3. Delete from DB
    const { error: dbError } = await supabase
      .from("student_files")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Erro ao excluir arquivo" });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
