const express = require('express');
const mongoose = require('mongoose');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/ordersDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const clientSchema = new mongoose.Schema({
    user_id: Number,
    email: { type: String, unique: true },
    name: String,
    isNew: Boolean,
});

const orderSchema = new mongoose.Schema({
    order_id: Number,
    email: String,
    status: String,
    total: Number,
});

const Client = mongoose.model('Client', clientSchema);
const Order = mongoose.model('Order', orderSchema);

const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: 'Client Orders API',
            description: 'API for client and order management',
            version: '1.0.0',
        },
        servers: [{ url: 'http://localhost:3000' }],
    },
    apis: ['server.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /company-info:
 *   get:
 *     description: Отримати інформацію про компанію за email користувача
 *     parameters:
 *       - name: email
 *         description: Email користувача
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Успішно
 */
app.get('/company-info', async (req, res) => {
    const { email } = req.query;

    let client = await Client.findOne({ email });
    if (!client) {
        client = new Client({ email, name: 'New User', isNew: true });
        await client.save();
        return res.status(200).json({
            is_new_client: true,
            company_info: {
                name: 'Назва компанії',
                description: 'Опис компанії',
                contacts: 'Контактна інформація',
            },
        });
    }

    res.status(200).json({
        is_new_client: false,
        company_info: {
            name: 'Назва компанії',
            description: 'Опис компанії',
            contacts: 'Контактна інформація',
        },
    });
});

/**
 * @swagger
 * /get-client-orders:
 *   get:
 *     description: Отримати інформацію про замовлення клієнта за email
 *     parameters:
 *       - name: email
 *         description: Email користувача
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Успішно
 */
app.get('/get-client-orders', async (req, res) => {
    const { email } = req.query;

    let client = await Client.findOne({ email });
    if (!client) {
        return res.status(404).json({ message: 'Клієнта не знайдено' });
    }

    const orders = await Order.find({ email });
    res.status(200).json({
        is_new_client: false,
        orders,
    });
});



/**
 * @swagger
 * /connect-operator:
 *   post:
 *     description: Перенаправити запит до оператора
 *     parameters:
 *       - name: data
 *         description: email користувача та питання
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               description: Email користувача
 *             request:
 *               type: string
 *               description: Опис питання клієнта
 *     responses:
 *       200:
 *         description: Запит передано оператору
 */
app.post('/connect-operator', async (req, res) => {
    const { data } = req.body;
    if (!data || !data.email || !data.request) {
        return res.status(400).json({ message: 'Будь ласка, надайте email та запит.' });
    }

    const { email, request } = data;

    let client = await Client.findOne({ email });
    if (!client) {
        return res.status(404).json({ message: 'Клієнта не знайдено' });
    }

    res.status(200).json({
        status: 'success',
        message: 'Ваш запит передано оператору. Очікуйте на відповідь.',
    });
});



/**
 * @swagger
 * /add-client:
 *   post:
 *     description: Додати нового користувача
 *     parameters:
 *       - name: data
 *         description: Дані користувача для реєстрації
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               description: Email користувача
 *             name:
 *               type: string
 *               description: Ім'я користувача
 *     responses:
 *       200:
 *         description: Користувача успішно додано
 *       400:
 *         description: Користувач вже існує або не вказані дані
 */
app.post('/add-client', async (req, res) => {
    const { data } = req.body;
    if (!data || !data.email || !data.name) {
        return res.status(400).json({ message: 'Будь ласка, надайте email та ім\'я.' });
    }

    const { email, name } = data;

    let client = await Client.findOne({ email });
    if (client) {
        return res.status(400).json({ message: 'Користувач вже існує' });
    }

    client = new Client({ email, name, isNew: false });
    await client.save();

    res.status(200).json({
        status: 'success',
        message: 'Користувача успішно додано',
        client,
    });
});

/**
 * @swagger
 * /create-order:
 *   post:
 *     description: Оформити нове замовлення
 *     parameters:
 *       - name: data
 *         description: Дані для замовлення
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               description: Email користувача
 *             total:
 *               type: number
 *               description: Загальна сума замовлення
 *     responses:
 *       200:
 *         description: Замовлення успішно оформлено
 *       404:
 *         description: Користувача не знайдено
 *       400:
 *         description: Неправильні дані для замовлення
 */
app.post('/create-order', async (req, res) => {
    const { data } = req.body;

    // Перевіряємо, чи дані вказані
    if (!data || !data.email || data.total === undefined) {
        return res.status(400).json({ message: 'Будь ласка, надайте email та загальну суму замовлення.' });
    }

    const { email, total } = data;

    let client = await Client.findOne({ email });
    if (!client) {
        return res.status(404).json({ message: 'Користувача не знайдено' });
    }

    try {
        const lastOrder = await Order.findOne().sort({ order_id: -1 });
        const newOrderId = lastOrder ? lastOrder.order_id + 1 : 1;

        const newOrder = new Order({ order_id: newOrderId, email, status: 'В обробці', total });
        await newOrder.save();

        res.status(200).json({
            status: 'success',
            message: 'Замовлення успішно оформлено',
            order: newOrder,
        });
    } catch (error) {
        res.status(500).json({ message: 'Виникла помилка при оформленні замовлення.' });
    }
});


app.listen(3000, () => {
    console.log('Swagger Docs: http://localhost:3000/api-docs');
});
