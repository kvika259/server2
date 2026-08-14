const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

//свагер
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerSpec.js'); 

//база данных
const {MongoClient, ObjectId} = require('mongodb')


const express = require('express')
const cors = require('cors');
const fs = require('fs/promises') // добавление файлового сервера
const path = require('path')
const {validateCreateTask, validateUpdateTask,validateToggleTask,validateGetTask,
    validateGetTasks, handleValidationErrors} = require('./validation')
const {readFile, createFile, deleteFile} = require('./workWithFile')

const SECRET = 'access'
const TOKEN_TTL = '24h'
const URLMongo = 'mongodb://kvika259_db_user:qrwNornXUs5z2RzB@ac-sgheq2l-shard-00-00.udleimt.mongodb.net:27017,ac-sgheq2l-shard-00-01.udleimt.mongodb.net:27017,ac-sgheq2l-shard-00-02.udleimt.mongodb.net:27017/?replicaSet=atlas-105359-shard-0&ssl=true&authSource=admin'
const URLMongoLocal = 'mongodb://localhost:27017'

const app = express()
app.use(cors());
// Определяем маршрут для Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(express.json()) // задает формат на все запросы



// Middleware для перехвата сломанного JSON
app.use((error, req, res, next) => {
    // Проверяем, что это ошибка синтаксиса (SyntaxError) и она связана с парсингом тела запроса (body)
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.error('Ошибка парсинга JSON от клиента:', error.message);
        return res.status(400).json({ 
            error: 'Невалидный формат JSON', 
            details: 'Проверьте синтаксис запроса (возможно, присутствует лишняя запятая или пропущены кавычки)' 
        });
    }
    next(); // Если ошибка другая, передаем её дальше
});

//console.log('Dirname', __dirname)
const DB = path.join(__dirname, 'db.json') // dirname - путь в текущую папку, вторым параметром - название файла


//регистрация
app.post('/auth/register', async (req, res)=>{
    try {
        const {email, password} = req.body
    const user = {
         email,
         passwordHash: await bcrypt.hash(password, 10) // надо в любом случае хэшить пароль, поэтому этот объект обязателен
     }

    const client = new MongoClient(URLMongo)
    const connection = await client.connect()
    const users = connection.db('lection_db').collection('users')

    await users.insertOne(user)
    connection.close();
    res.status(201).json({access_token: signToken(user)})
    } catch (error) {
        console.error('Ошибка регистрации:', error.message)
        res.status(500).json({ error: 'Ошибка регистрации', details: error.message })
    }
})

//авторизация
app.post('/auth/login', async (req, res)=>{
    const {email, password} = req.body

    const client = new MongoClient(URLMongo)
    const connection = await client.connect()
    const users = connection.db('lection_db').collection('users')
    const user = await users.findOne({email:email})
   

    const pass = await bcrypt.compare(password, user.passwordHash)

    if(!user || !pass){res.status(401).send("Неверный email или пароль")}
    connection.close();
    res.json({access_token: signToken(user)})
})

function signToken({_id = 1,email}){
    return jwt.sign({id: new ObjectId(_id), email: email}, SECRET, {expiresIn: TOKEN_TTL} ) // id от могодб прописывается через нижнее подчеркивание
}

//аутентификация
function auth(req,res,next){
    const [type, token] = req.headers.authorization.split(' ')

    try {
        req.user = jwt.verify(token, SECRET, {algorithms:['HS256']})
        next()
    } catch (error) {
        const expired = error.name === 'TokenExpiredError'
        res.status(401).send({error:expired? 'Токен истек' : "Токен невалиден"})
    }
}




app.get('/getTodo/:id', auth, validateGetTask, handleValidationErrors, async (req, res) => { 
    try {
        const { id } = req.params
        
        const client = new MongoClient(URLMongo)
        const connection = await client.connect()
        const tasks = connection.db('lection_db').collection('tasks')
        let task = await tasks.findOne({userID:req.user.id, _id: new ObjectId(id)})

        // ВАЛИДАЦИЯ НАЛИЧИЯ MongoDB Если задачи нет, вернет null
        if (task == null) {return res.status(404).json(`Задача с id ${id} не найдена`);}
        connection.close();
        res.json(task)
    } catch (error) {
       res.send(error.message)
    }
})

app.get('/todos/', auth, validateGetTasks, handleValidationErrors, async (req, res) => { 
    try {
        const { completed } = req.query

        const client = new MongoClient(URLMongo)
        const connection = await client.connect()
        const tasks = connection.db('lection_db').collection('tasks')
        let task = await tasks.find({userID:req.user.id}).toArray()
        
        if (completed !== undefined){task = task.filter(i=> i.done.toString() === completed)}
        connection.close();
        res.json(task)
    } catch (error) {
       res.send(error.message)
    }
})

app.post('/todos', auth, validateCreateTask, handleValidationErrors, async (req, res) => { // создание таски
    try {
        const {title, description} = req.body
        
        const client = new MongoClient(URLMongo)
        const connection = await client.connect()
        const tasks = connection.db('lection_db').collection('tasks')
        const newTask = {title, description, done: false, createdAt: new Date(), userID: req.user.id}
        await tasks.insertOne(newTask)

        connection.close();
        res.status(201).json(newTask)} 
    
    catch (error) {
        res.status(500).json({ error: 'Не удалось сохранить задачу', details: error.message })
    }
})


app.put('/todos/:id', auth, validateUpdateTask,handleValidationErrors, async (req, res) => { //изменение названия
    try{
    const {title, description} = req.body
    const { id } = req.params
    
    const client = new MongoClient(URLMongo)
    const connection = await client.connect()
    const tasks = connection.db('lection_db').collection('tasks')
    const updateTask = await tasks.findOneAndUpdate({userID:req.user.id, _id: new ObjectId(id)}, { $set: { title:title,  description:description} }, { returnDocument: 'after' })
    // ВАЛИДАЦИЯ НАЛИЧИЯ
        if (!updateTask) {return res.status(404).json(`Задача с id ${id} не найдена`);}

    connection.close();
    res.json(updateTask)
    } catch (error) {
        res.send(error.message)
    }
})

app.patch('/todos/:id/toggle', auth, validateToggleTask, handleValidationErrors, async (req, res) => { //изменение комплитед
    try{const { id } = req.params

    const client = new MongoClient(URLMongo)
    const connection = await client.connect()
    const tasks = connection.db('lection_db').collection('tasks')
    const updateTask = await tasks.updateOne({userID:req.user.id, _id: new ObjectId(id)}, [{ $set: { done:{ $not: "$done" } } }])
    // ВАЛИДАЦИЯ НАЛИЧИЯ если совпадений по поиску нет, то у обекта ответа апдейт в свойстве matchedCount будет 0
    if (updateTask.matchedCount == 0) {return res.status(404).json(`Задача с id ${id} не найдена`);}
    
        connection.close();
    
        res.send(`Изменена таска ${id}`)} 
    catch (error) {
        res.send(error.message)
    }
})

app.delete('/todos/:id', auth, handleValidationErrors, async (req, res) => { 
    try{const { id } = req.params
    const client = new MongoClient(URLMongo)
    const connection = await client.connect()
    const tasks = connection.db('lection_db').collection('tasks')
    await tasks.deleteOne({userID:req.user.id, _id: new ObjectId(id)})
    
    connection.close();
    res.send(id)} catch (error) {
        res.send(error.message)
    }
})




app.listen(5001, () => { console.log("Старт") }) // консол лог обязателен для проверки, ссылка на локалхост прописывается вручную