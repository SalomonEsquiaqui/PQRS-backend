const express = require('express');
const router = express.Router();
const supabase = require('../models/supabase');


// 🔥 1. LISTAR TODAS LAS PQRS (CON RELACIONES)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('requests')
     // ✅ DESPUÉS — agrega user_id, request_type_id, status_id, category_id
.select(`
    id,
    user_id,
    request_type_id,
    status_id,
    category_id,
    title,
    description,
    created_at,
    users (first_name, last_name),
    request_types (name),
    request_statuses (name),
    categories (name)
`)

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔥 2. CREAR NUEVA PQRS
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      request_type_id,
      status_id,
      category_id,
      title,
      description
    } = req.body;

    const { data, error } = await supabase
      .from('requests')
      .insert([
        {
          user_id,
          request_type_id,
          status_id,
          category_id,
          title,
          description
        }
      ]);

    if (error) throw error;

    res.json({ mensaje: 'PQRS creada correctamente', data });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔥 3. OBTENER PQRS POR ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔥 4. ACTUALIZAR PQRS
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { title, description, status_id } = req.body;

    const { data, error } = await supabase
      .from('requests')
      .update({ title, description, status_id })
      .eq('id', id);

    if (error) throw error;

    res.json({ mensaje: 'PQRS actualizada', data });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔥 5. ELIMINAR PQRS
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ mensaje: 'PQRS eliminada' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ACTUALIZAR ESTADO */
router.put("/:id", async (req, res) => {

    const { id } = req.params;

    const { status_id } = req.body;

    const { data, error } = await supabase
    .from("requests")
    .update({ status_id })
    .eq("id", id);

    if(error){

        return res.status(500).json(error);

    }

    res.json({
        mensaje:"Estado actualizado",
        data
    });

});

module.exports = router;