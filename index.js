const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

async function run() {
    try {
        const categoriesCollection = client.db('bike-sales').collection('categories')
        const usersCollection = client.db('bike-sales').collection('users')
        const productsCollection = client.db('bike-sales').collection('products')
        const bookingCollection = client.db('bike-sales').collection('bookings')
        const paymentsCollection = client.db('bike-sales').collection('payments')


        app.get('/categories', async (req, res) => {
            const query = {}
            const categories = await categoriesCollection.find(query).toArray()
            res.send(categories)
        })

        app.get('/products', async (req, res) => {

            const email = req.query.email

            const query = {
                sellerEmail: email
            }
            const products = await productsCollection.find(query).toArray()
            res.send(products)
        })

        app.get('/products/advertised', async (req, res) => {
            const query = { advertise: true }
            const advertised = await productsCollection.find(query).toArray()
            res.send(advertised)
        })

        app.get('/products/:id', async (req, res) => {
            const categoryId = req.params.id
            const query = { categoryId }
            const products = await productsCollection.find(query).toArray()
            res.send(products)
        });

        app.get('/bookings', verifyJWT, async (req, res) => {

            const email = req.query.email
            const decodedMail = req.decoded.email
            const query = {
                email: email
            }

            if (email !== decodedMail) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const bookings = await bookingCollection.find(query).toArray()
            res.send(bookings)
        })

        app.get('/bookings/:id', async (req, res) => {

            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const booking = await bookingCollection.findOne(query)
            res.send(booking)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        });


        app.get('/jwt', async (req, res) => {

            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user && user?.email) {
                const token = jwt.sign({ email }, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '7d' })
                return res.send({ jwToken: token })
            }
            res.status(403).send({ jwToken: 'forbidden access' })

        })

        app.post('/products', async (req, res) => {
            const product = req.body
            // console.log(product);
            const result = await productsCollection.insertOne(product)
            res.send(result)
        });

        app.post("/create-payment-intent", async (req, res) => {

             const booking=req.body
             const price=booking.price
             const amount=price*100

             const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                  "card"
                ],
              });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
         

        app.post('/payments',async(req,res)=>{
            const payment=req.body 
            const result =await paymentsCollection.insertOne(payment)
            res.send(result)
        })
        

        app.put('/products/:id', async (req, res) => {

            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    advertise: true
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
        });


        app.get('/users/account/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ account: user?.accountType });

        })

        app.get('/users', async (req, res) => {

            let query = {}

            if (req.query.accountType) {
                query = {
                    accountType: req.query.accountType
                }
            }
            const users = await usersCollection.find(query).toArray();
            res.send(users)
        })

        app.post('/users', async (req, res) => {
            const user = req.body

            const result = await usersCollection.insertOne(user)
            // console.log(result);
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)

        })
    }
    finally {

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