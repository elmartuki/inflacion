const express = require('express');
const mysql = require('mysql');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const cors = require('cors');


app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());  // Habilitar CORS para permitir solicitudes desde el frontend
const https = require('https');
const http = require('http');


const opcionesSSL = {
    cert: fs.readFileSync('C:/xampp/apache/conf/ssl.crt/certificate.crt'),  // Ruta al certificado
    key: fs.readFileSync('C:/xampp/apache/conf/ssl.key/private.key'),  // Ruta a la clave privada
  };



app.use(cors());
app.use(express.json());


const multer = require('multer');
const csv = require('csv-parser');

const upload = multer({ dest: 'uploads/' });

app.post('/importar-csv', upload.single('csv'), (req, res) => {
  const resultados = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => resultados.push(data))
    .on('end', () => {
      fs.unlinkSync(req.file.path); // borrar archivo temporal

      const values = resultados.map(r => [
        r.nombre?.trim() || '',
        parseFloat(r.precio_hoy) || 0,
        parseFloat(r.precio_7dias) || 0,
        parseFloat(r.precio_14dias) || 0,
        parseFloat(r.precio_21dias) || 0,
        parseFloat(r.precio_historico) || 0
      ]);

      if (values.length === 0) {
        return res.status(400).send('El archivo CSV está vacío o mal formateado');
      }

      const insertQuery = `
        INSERT INTO inflacion (nombre, precio_hoy, precio_7dias, precio_14dias, precio_21dias, precio_historico)
        VALUES ?
      `;

      db.query(insertQuery, [values], (err) => {
        if (err) {
          console.error('❌ Error al importar CSV:', err);
          return res.status(500).send('Error al importar CSV');
        }
        res.send('✅ Archivo CSV importado correctamente');
      });
    });
});


app.delete('/inflacion/:id', (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM inflacion WHERE id = ?';
  
    db.query(query, [id], (err, result) => {
      if (err) {
        console.error('❌ Error al eliminar producto:', err);
        return res.status(500).send('Error al eliminar producto');
      }
      res.send('✅ Producto eliminado correctamente');
    });
  });
  

// Conexión a MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '44659947mB@', // coloca tu contraseña si tienes una
  database: 'inflacion'
});

// Verificación de conexión
db.connect(err => {
  if (err) {
    console.error('Error de conexión a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

// Obtener todos los productos
app.get('/inflacion', (req, res) => {
  db.query('SELECT * FROM inflacion', (err, resultados) => {
    if (err) return res.status(500).send(err);
    res.json(resultados);
  });
});

app.post('/desplazar', (req, res) => {
    const query = `
      UPDATE inflacion SET
        precio_21dias = precio_14dias,
        precio_14dias = precio_7dias,
        precio_7dias = precio_hoy
    `;
    db.query(query, (err) => {
      if (err) {
        console.error('❌ Error al desplazar los precios:', err);
        return res.status(500).send('Error al desplazar los precios');
      }
      res.send('✅ Precios desplazados correctamente');
    });
  });
  


  

// Agregar nuevo producto
app.post('/inflacion', (req, res) => {
  const {
    nombre, precio_hoy, precio_7dias,
    precio_14dias, precio_21dias,
    precio_historico
  } = req.body;

  const sql = `INSERT INTO inflacion 
    (nombre, precio_hoy, precio_7dias,
    precio_14dias, precio_21dias,
    precio_historico)
    VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [
    nombre, precio_hoy, precio_7dias,
    precio_14dias, precio_21dias,
    precio_historico
  ], (err, resultado) => {
    if (err) return res.status(500).send(err);
    res.send('Producto agregado correctamente');
  });
});

// Editar producto existente
app.put('/inflacion/:id', (req, res) => {
  const { id } = req.params;
  const {
    nombre, precio_hoy, precio_7dias,
    precio_14dias, precio_21dias,
    precio_historico
  } = req.body;

  const sql = `UPDATE inflacion SET 
    nombre = ?, precio_hoy = ?, precio_7dias = ?,
    precio_14dias = ?, precio_21dias = ?,
    precio_historico = ?
    WHERE id = ?`;

  db.query(sql, [
    nombre, precio_hoy, precio_7dias,
    precio_14dias, precio_21dias,
    precio_historico, id
  ], (err, resultado) => {
    if (err) return res.status(500).send(err);
    res.send('Producto actualizado');
  });
});

db.connect(err => {
  if (err) {
    console.error('❌ Error de conexión:', err);
    return;
  }
  console.log('✅ Conectado a MySQL');
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'clave-secreta',
  resave: false,
  saveUninitialized: true,
}));

// Servir archivos desde la misma carpeta
app.use(express.static(__dirname));

// Verificar sesión
function verificarLogin(req, res, next) {
  if (req.session && req.session.usuario === 'admin') {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// Ruta de login
app.post('/login', (req, res) => {
  const { usuario, password } = req.body;
  db.query('SELECT * FROM admins WHERE usuario = ? AND password = ?', [usuario, password], (err, result) => {
    if (err) return res.send('Error al consultar la base de datos');
    if (result.length > 0) {
      req.session.usuario = 'admin';
      res.redirect('/formulario.html');
    } else {
      res.redirect('/login.html');
    }
  });
});

// Verificar sesión desde JS
app.get('/verificar-sesion', (req, res) => {
  if (req.session && req.session.usuario === 'admin') {
    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
});

// Ruta protegida
app.get('/formulario.html', verificarLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'formulario.html'));
});

// Cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});


https.createServer(opcionesSSL, app).listen(4000, '0.0.0.0', () => {
    console.log('Servidor HTTPS corriendo en https://veterinarialol.ddns.net:4000');
});



