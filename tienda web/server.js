// Backend simple con Express que guarda pedidos en orders.json
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname))); // sirve archivos estáticos (index.html, css, js, images)

// Endpoint para recibir pedidos
app.post('/api/orders', (req, res) => {
  const order = req.body;
  if (!order || !order.id) {
    return res.status(400).json({ error: 'Pedido inválido' });
  }

  const ordersFile = path.join(__dirname, 'orders.json');
  let orders = [];
  try {
    if (fs.existsSync(ordersFile)) {
      const raw = fs.readFileSync(ordersFile, 'utf8');
      orders = raw ? JSON.parse(raw) : [];
    }
  } catch (err) {
    console.error('Error leyendo orders.json', err);
  }

  orders.push(order);

  try {
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error('Error escribiendo orders.json', err);
    return res.status(500).json({ error: 'No se pudo guardar el pedido' });
  }

  console.log('Nuevo pedido registrado:', order.id);
  return res.status(201).json({ message: 'Pedido registrado con éxito', orderId: order.id });
});

// Ruta health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
