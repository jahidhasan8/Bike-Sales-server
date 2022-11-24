const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000

const app = express()

app.use(cors())
app.use(express.json())






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8ky5qyn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        const categoriesCollection = client.db('bike-sales').collection('categories')
        const usersCollection = client.db('bike-sales').collection('users')

        app.get('/categories',async(req,res)=>{
            const query={}
            const categories= await categoriesCollection.find(query).toArray()
            res.send(categories)
        })
        app.post('/users', async (req, res) => {
            const user = req.body
            
            const result = await usersCollection.insertOne(user)
            console.log(result);
            res.send(result)
        })
    }
    finally{

    }
}

run()
.catch(error => console.log(error.message))

app.get('/', async (req, res) => {
    res.send('Bike Sales server is running')
})


app.listen(port, () => {
    console.log(`Bike Sales server is running on port ${port}`);
})