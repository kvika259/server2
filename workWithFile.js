const express = require('express')
const fs = require('fs/promises')
const path = require('path')

const DB = path.join(__dirname, 'db.json')

async function readFile(){
    try {
       const row = await fs.readFile(DB, 'utf-8') 
       return JSON.parse(row)
    } catch (error) {
        if (error.code === 'ENOENT'){throw new Error ("Такого файла не существует")}
        if (error instanceof SyntaxError) {throw new Error('Ошибка чтения: Нельзя преобразовать в JSON, обратите внимание на , или }')}
        throw error
    }
}

async function createFile(req, res) {
    try {
            await fs.writeFile(DB, JSON.stringify({users:[],tasks:[]}, null, 2), {flag: 'wx'}) // флаг wx означает то, что если файла нет, то система его создаст по пути DB
                                                                            // внутри JSON те данные, которые кладем в файл
            res.send('Создал')
        } catch (error) {
            if (error.code === 'EEXIST'){res.status(409).send("Такой файл уже есть")}
            res.status(500).json({ error: 'Не удалось создать файл', details: error.message })
        }  
}

async function deleteFile(req, res) {
    try {
       await fs.unlink(DB) 
        res.send("Файл удален")
    } catch (error) {
        if (error.code === 'ENOENT'){res.send("Такого файла не существует")}
         res.status(500).json({ error: 'Ошибка при удалении файла', details: error.message })
     }    
}
module.exports = {readFile, createFile, deleteFile}