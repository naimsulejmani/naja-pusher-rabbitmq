const express = require('express');
const bodyParser = require('body-parser');
const amqplib = require('amqplib');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const messagesFile = path.join(__dirname, 'messages.json');

// Setup
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Ensure messages.json exists
if (!fs.existsSync(messagesFile)) fs.writeFileSync(messagesFile, '[]');

app.get('/', (req, res) => {
    const messages = JSON.parse(fs.readFileSync(messagesFile));
    res.render('index', { messages });
});

app.post('/publish', async (req, res) => {
    const { rabbitmqUrl, queueName, message } = req.body;

    try {
        const connection = await amqplib.connect(rabbitmqUrl);
        const channel = await connection.createChannel();
        await channel.assertQueue(queueName);
        channel.sendToQueue(queueName, Buffer.from(message));

        const entry = {
            timestamp: new Date().toISOString(),
            queue: queueName,
            message
        };

        const messages = JSON.parse(fs.readFileSync(messagesFile));
        messages.unshift(entry);
        fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));

        await channel.close();
        await connection.close();
        res.redirect('/');
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Failed to publish message');
    }
});

// Background consumer for 'test' queue
async function startConsumer() {
    const rabbitmqUrl = 'amqp://localhost'; // Change if needed
    const queueName = 'test';

    try {
        const connection = await amqplib.connect(rabbitmqUrl);
        const channel = await connection.createChannel();
        await channel.assertQueue(queueName);

        console.log(`Consumer started for queue: ${queueName}`);

        channel.consume(queueName, (msg) => {
            if (msg !== null) {
                try {
                    const content = msg.content.toString();
                    console.log(`[Consumer] Received from "${queueName}":`, content);
                    // throw new Error('Simulated error for testing');
                    channel.ack(msg);
                } catch (error) {
                    console.error('Error processing message:', error);
                    channel.nack(msg, false, false); // Reject the message without requeueing
                }
            }
        });
    } catch (err) {
        console.error('Consumer error:', err);
    }
}

startConsumer();

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
