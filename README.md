# naja-pusher

A simple Node.js app to send and consume messages from RabbitMQ queues via a web interface.

## Features

- Send messages to any RabbitMQ queue from a web form
- View a list of sent messages
- Background consumer for the `test` queue (logs messages to console)

## Requirements

- Node.js
- RabbitMQ server

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Start your RabbitMQ server (default: `amqp://localhost`).

3. Start the app:

   ```sh
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- Fill in the RabbitMQ URL, queue name, and message in the form to send a message.
- Sent messages are listed below the form.
- The app consumes messages from the `test` queue and logs them to the console.

## Project Structure

- `app.js` - Main application file
- `messages.json` - Stores sent messages (not tracked in git)
- `views/` - EJS templates
- `public/` - Static assets

## License

MIT