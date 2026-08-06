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
const TOKEN_TTL = '1h'


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
app.post('/registration', async (req, res)=>{
    // const {email, password} = req.body
    // const db = await readFile()

    // const user = {
    //     id: crypto.randomUUID(),
    //     email,
    //     passwordHash: await bcrypt.hash(password, 10)
    // }

    // db.users.push(user)
    // await fs.writeFile(DB, JSON.stringify(db, null, 2))

    // res.status(201).json({id: user.id, email: user.email})

    const {email, password} = req.body
    const user = {
         email,
         passwordHash: await bcrypt.hash(password, 10) // надо в любом случае хэшить пароль, поэтому этот объект обязателен
     }

    const client = new MongoClient('mongodb://localhost:27017')
    const connection = await client.connect()
    const users = connection.db('lection_db').collection('users')

    users.insertOne(user)
    connection.close();
    res.send("Создан")
})

//авторизация
app.post('/login', async (req, res)=>{
    const {email, password} = req.body

    // const db = await readFile()
    // const user = db.users.find(i=>i.email === email)


    const client = new MongoClient('mongodb://localhost:27017')
    const connection = await client.connect()
    const users = connection.db('lection_db').collection('users')
    const user = await users.findOne({email:email})
   

    const pass = await bcrypt.compare(password, user.passwordHash)

    if(!user || !pass){res.status(401).send("Неверный email или пароль")}
    connection.close();
    res.json({token: signToken(user)})
})

function signToken(user){
    return jwt.sign({id: new ObjectId(user._id), email: user.email}, SECRET, {expiresIn: TOKEN_TTL} ) // id от могодб прописывается через нижнее подчеркивание
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



// работа с файловой системой
app.get('/createFile', async (req, res) => createFile(req, res))

app.get('/readFile', async (req, res) => { 
    const data = await readFile()
    res.json(data)
})

app.delete('/deleteFile', async (req, res) => deleteFile(req, res))




//работа с данными в файловой системе

async function findTask(file, id, req, res) {
    const index = file.findIndex(i=> i.id == id && i.userID === req.user.id)
    return index
}


app.get('/getTodo/:id', auth, validateGetTask, handleValidationErrors, async (req, res) => { 
    try {
        const { id } = req.params
        //const {tasks} = await readFile()
        //const taskIndex = await findTask(tasks, id, req, res)  
        const client = new MongoClient('mongodb://localhost:27017')
        const connection = await client.connect()
        const tasks = connection.db('lection_db').collection('tasks')
        let task = await tasks.findOne({userID:req.user.id, _id: new ObjectId(id)})

        // ВАЛИДАЦИЯ НАЛИЧИЯ MongoDB Если задачи нет, вернет null
        if (task == null) {return res.status(404).json(`Задача с id ${id} не найдена`);}
        // ВАЛИДАЦИЯ НАЛИЧИЯ: Если задачи нет, findIndex вернет -1
        //if (taskIndex == -1) {return res.status(404).json(`Задача с id ${id} не найдена`);}
        connection.close();
        res.json(task)
    } catch (error) {
       res.send(error.message)
    }
})

app.get('/getTodo/', auth, validateGetTasks, handleValidationErrors, async (req, res) => { 
    try {
        const { completed } = req.query
        //const {tasks} = await readFile()

        const client = new MongoClient('mongodb://localhost:27017')
        const connection = await client.connect()
        const tasks = connection.db('lection_db').collection('tasks')
        let task = await tasks.find({userID:req.user.id}).toArray()
        
        if (completed !== undefined){task = task.filter(i=> i.done.toString() === completed)}
        //const task =  tasks.filter(i=> i.userID === req.user.id).filter(i=> i.done.toString() === completed)
        connection.close();
        res.json(task)
    } catch (error) {
       res.send(error.message)
    }
})

app.post('/createTask', auth, validateCreateTask, handleValidationErrors, async (req, res) => { // создание таски
    try {
        const {title} = req.body
        
        //const data = await readFile()
        const client = new MongoClient('mongodb://localhost:27017')
        const connection = await client.connect()
        const tasks = connection.db('lection_db').collection('tasks')
        tasks.insertOne({title, done: false, createdAt: new Date(), userID: req.user.id})

        //data.tasks.push({id:crypto.randomUUID(), title, done: false, createdAt: new Date(), userID: req.user.id})
        //await fs.writeFile(DB, JSON.stringify(data, null, 2))
        connection.close();
        res.status(201).send('Добавил')} 
    
    catch (error) {
        res.status(500).json({ error: 'Не удалось сохранить задачу', details: error.message })
    }
})


app.put('/updateTask/:id', auth, validateUpdateTask,handleValidationErrors, async (req, res) => { //изменение названия
    try{
    const {title} = req.body
    const { id } = req.params
    
    // const data = await readFile()
    // const updateTask = await findTask(data.tasks, id, req, res)  
    const client = new MongoClient('mongodb://localhost:27017')
    const connection = await client.connect()
    const tasks = connection.db('lection_db').collection('tasks')
    const updateTask = await tasks.updateOne({userID:req.user.id, _id: new ObjectId(id)}, { $set: { title:title } })
    // ВАЛИДАЦИЯ НАЛИЧИЯ если совпадений по поиску нет, то у обекта ответа апдейт в свойстве matchedCount будет 0
        if (updateTask.matchedCount == 0) {return res.status(404).json(`Задача с id ${id} не найдена`);}

    // ВАЛИДАЦИЯ НАЛИЧИЯ: Если задачи нет, findIndex вернет -1
    // if (updateTask == -1) {return res.status(404).json(`Задача с id ${id} не найдена`);}
    // data.tasks[updateTask].title = title

    //await fs.writeFile(DB, JSON.stringify(data, null, 2))
    //res.json(data.tasks[updateTask])
    connection.close();
    res.send(`Задача изменена`)
    } catch (error) {
        res.send(error.message)
    }
})

app.patch('/updateTask/:id', auth, validateToggleTask, handleValidationErrors, async (req, res) => { //изменение комплитед
    try{const { id } = req.params

    // const data = await readFile()
    // const updateTask = await findTask(data.tasks, id, req, res) 
    // // ВАЛИДАЦИЯ НАЛИЧИЯ: Если задачи нет, findIndex вернет -1
    // if (updateTask == -1) {return res.status(404).json(`Задача с id ${id} не найдена`);} 
    // data.tasks[updateTask].done = !data.tasks[updateTask].done
    // await fs.writeFile(DB, JSON.stringify(data, null, 2))

    const client = new MongoClient('mongodb://localhost:27017')
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

app.delete('/deleteTask/:id', auth, handleValidationErrors, async (req, res) => { 
    try{const { id } = req.params
    const client = new MongoClient('mongodb://localhost:27017')
    const connection = await client.connect()
    const tasks = connection.db('lection_db').collection('tasks')
    tasks.deleteOne({userID:req.user.id, _id: new ObjectId(id)})
    
    // const data = await readFile()
    // const deleteTask = await findTask(data.tasks, id, req, res)
    // // ВАЛИДАЦИЯ НАЛИЧИЯ: Если задачи нет, findIndex вернет -1
    // if (deleteTask == -1) {return res.status(404).json(`Задача с id ${id} не найдена`);}
    // data.tasks.splice(deleteTask, 1)
    // await fs.writeFile(DB, JSON.stringify(data, null, 2))
    connection.close();
    res.send(id)} catch (error) {
        res.send(error.message)
    }
})




app.listen(5001, () => { console.log("Старт") }) // консол лог обязателен для проверки, ссылка на локалхост прописывается вручную