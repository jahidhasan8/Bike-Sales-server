const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt=require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000

const app = express()

app.use(cors())
app.use(express.json())






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8ky5qyn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next()
    })
}

async function run(){
    try{
        const categoriesCollection = client.db('bike-sales').collection('categories')
        const usersCollection = client.db('bike-sales').collection('users')
        const productsCollection = client.db('bike-sales').collection('products')

        app.get('/categories',async(req,res)=>{
            const query={}
            const categories= await categoriesCollection.find(query).toArray()
            res.send(categories)
        })
        

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const products = await productsCollection.findOne(query)
            res.send(products)
        });
         
        app.get('/jwt', async (req, res) => {

            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '7d' })
                return res.send({ jwToken: token })
            }
            res.status(403).send({ jwToken: '' })

        })
         
        app.post('/products', async (req, res) => {
            const product = req.body
            // console.log(product);
            const result = await productsCollection.insertOne(product)
            res.send(result)
        });


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