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

        app.get('/products/advertised',verifyJWT, async (req, res) => {
            const query = {
                advertise: true,

            }
            const advertised = await productsCollection.find(query).toArray()
            const unsoldProduct = advertised.filter(product => product?.sold !== true)
            res.send(unsoldProduct)
        })

        app.get('/products/reported', async (req, res) => {
            const query = {
                report: true,

            }
            const reportedProduct = await productsCollection.find(query).toArray()
            res.send(reportedProduct)
        })

        app.get('/products/:id', async (req, res) => {
            const categoryId = req.params.id
            const query = {
                categoryId
            }
            const products = await productsCollection.find(query).toArray()
            const unsoldProduct = products.filter(product => product?.sold !== true)
            res.send(unsoldProduct)
        });

        app.post('/products', async (req, res) => {
            const product = req.body
            const result = await productsCollection.insertOne(product)
            // console.log(product)
             res.send(result)
        });

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

        app.put('/products/report/:id', async (req, res) => {

            const id = req.params.id
            
            const filter = {_id:ObjectId(id)}
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    report: true
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
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

            const query={
                productId: booking.productId,
                email:booking.email

            }

            const booked=await bookingCollection.find(query).toArray()

            if(booked.length){
                 const message='You have already book this product'
                 return res.send({acknowledged:false,message})
            }

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
            res.status(403).send({ jwToken: '' })

        })


        app.post("/create-payment-intent", async (req, res) => {

            const booking = req.body
            const price = booking.price
            const amount = price * 100

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


        app.post('/payments', async (req, res) => {
            const payment = req.body
            const result = await paymentsCollection.insertOne(payment)
            const id = payment.bookingId
            const query = { _id: ObjectId(id) }

            const updatedInfo = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedData = await bookingCollection.updateOne(query, updatedInfo)

            const productId = payment.productId
            const productQuery = { _id: ObjectId(productId) }
            const updateInfo = {
                $set: {
                    sold: true,

                }
            }
            const productData = await productsCollection.updateOne(productQuery, updateInfo)

            res.send(result)
        })


        app.get('/users/account/:email', verifyJWT, async (req, res) => {

            const email = req.params.email
            const decodedMail = req.decoded.email

            if (email !== decodedMail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
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

        app.put('/users/:id', async (req, res) => {

            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    verify: true
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
        });


        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)

        })

        app.delete('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await productsCollection.deleteOne(filter)
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