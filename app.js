const express = require('express');
const bodyParser = require('body-parser');
const amqplib = require('amqplib');
const fs = require('fs');
const path = require('path');
const net = require('net'); // Add net module for TCP connections

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
    const { rabbitmqUrl, exchangeName, routingKey, queueName, message, repeatCount } = req.body;
    const repeat = parseInt(repeatCount) || 1;

    try {
        const connection = await amqplib.connect(rabbitmqUrl);
        const channel = await connection.createChannel();
        
        if (exchangeName) {
            // Using exchange with routing key
            await channel.assertExchange(exchangeName, 'topic');
            if (queueName) {
                await channel.assertQueue(queueName);
                await channel.bindQueue(queueName, exchangeName, routingKey || '');
            }
            
            // Send message multiple times
            for (let i = 0; i < repeat; i++) {
                const messageWithCounter = repeat > 1 ? `${message} [${i + 1}/${repeat}]` : message;
                channel.publish(exchangeName, routingKey || '', Buffer.from(messageWithCounter));
            }
        } else {
            // Direct queue (current behavior)
            await channel.assertQueue(queueName);
            
            // Send message multiple times
            for (let i = 0; i < repeat; i++) {
                const messageWithCounter = repeat > 1 ? `${message} [${i + 1}/${repeat}]` : message;
                channel.sendToQueue(queueName, Buffer.from(messageWithCounter));
            }
        }

        const entry = {
            timestamp: new Date().toISOString(),
            type: 'rabbitmq',
            exchange: exchangeName,
            routingKey: routingKey,
            queue: queueName,
            message,
            repeatCount: repeat
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

// Mirth HL7 sending route
app.post('/send-mirth', async (req, res) => {
    const { mirthHost, mirthPort, hl7Message, parseHl7 } = req.body;
    const port = parseInt(mirthPort);

    try {
        // Basic HL7 parsing if requested
        let parsedInfo = {};
        if (parseHl7) {
            const segments = hl7Message.split('\r');
            const mshSegment = segments[0];
            const fields = mshSegment.split('|');
            
            if (fields[0] === 'MSH') {
                parsedInfo = {
                    sendingApp: fields[2] || '',
                    sendingFacility: fields[3] || '',
                    receivingApp: fields[4] || '',
                    receivingFacility: fields[5] || '',
                    dateTime: fields[6] || '',
                    messageType: fields[8] || '',
                    controlId: fields[9] || '',
                    processingId: fields[10] || '',
                    versionId: fields[11] || ''
                };
                
                // Try to extract patient ID from PID segment
                const pidSegment = segments.find(seg => seg.startsWith('PID'));
                if (pidSegment) {
                    const pidFields = pidSegment.split('|');
                    parsedInfo.patientId = pidFields[3] || '';
                }
            }
        }

        // Send HL7 message via TCP to Mirth
        const success = await sendHL7ToMirth(mirthHost, port, hl7Message);
        
        if (success) {
            // Save to messages log
            const entry = {
                timestamp: new Date().toISOString(),
                type: 'mirth',
                host: mirthHost,
                port: port,
                message: hl7Message,
                messageType: parsedInfo.messageType,
                patientId: parsedInfo.patientId,
                controlId: parsedInfo.controlId
            };

            const messages = JSON.parse(fs.readFileSync(messagesFile));
            messages.unshift(entry);
            fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));

            res.redirect('/');
        } else {
            res.status(500).send('Failed to send HL7 message to Mirth');
        }
    } catch (err) {
        console.error('Mirth sending error:', err);
        res.status(500).send('Failed to send HL7 message: ' + err.message);
    }
});

// Function to send HL7 message via TCP
function sendHL7ToMirth(host, port, message) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const timeout = 15000; // 5 second timeout

        // Add MLLP wrapper (0x0B + message + 0x1C + 0x0D)
        const mllpStart = String.fromCharCode(0x0B); // <VT>
        const mllpEnd = String.fromCharCode(0x1C) + String.fromCharCode(0x0D); // <FS><CR>
        const wrappedMessage = mllpStart + message + mllpEnd;

        client.setTimeout(timeout);

        client.connect(port, host, () => {
            console.log(`Connected to Mirth server ${host}:${port}`);
            client.write(wrappedMessage);
        });

        client.on('data', (data) => {
            console.log('Received response from Mirth:', data.toString());
            client.destroy();
            resolve(true);
        });

        client.on('timeout', () => {
            console.error('Connection timeout');
            client.destroy();
            reject(new Error('Connection timeout'));
        });

        client.on('error', (err) => {
            console.error('Connection error:', err.message);
            reject(err);
        });

        client.on('close', () => {
            console.log('Connection closed');
        });
    });
}

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
