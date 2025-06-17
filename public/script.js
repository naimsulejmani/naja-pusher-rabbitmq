// Add some interactive functionality for the RabbitMQ form
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const exchangeInput = document.querySelector('input[name="exchangeName"]');
    const routingKeyInput = document.querySelector('input[name="routingKey"]');
    const queueInput = document.querySelector('input[name="queueName"]');

    // Show/hide routing key based on exchange name
    function toggleRoutingKey() {
        if (exchangeInput.value.trim()) {
            routingKeyInput.style.display = 'block';
            routingKeyInput.placeholder = 'Routing Key (required with exchange)';
        } else {
            routingKeyInput.style.display = 'block';
            routingKeyInput.placeholder = 'Routing Key (optional)';
        }
    }

    // Add event listeners
    exchangeInput.addEventListener('input', toggleRoutingKey);

    // Form validation
    form.addEventListener('submit', function(e) {
        const exchangeName = exchangeInput.value.trim();
        const queueName = queueInput.value.trim();
        const routingKey = routingKeyInput.value.trim();

        // If using exchange, warn if no routing key provided
        if (exchangeName && !routingKey) {
            const proceed = confirm('You\'re using an exchange but no routing key. Continue anyway?');
            if (!proceed) {
                e.preventDefault();
                return false;
            }
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
    });

    // Add preset buttons for common configurations
    addPresetButtons();
});

function addPresetButtons() {
    const form = document.querySelector('form');
    const presetDiv = document.createElement('div');
    presetDiv.innerHTML = `
        <h3>Quick Presets:</h3>
        <button type="button" onclick="setPreset('test')">Test Queue</button>
        <button type="button" onclick="setPreset('eventbus')">EventBus Config</button>
        <button type="button" onclick="setPreset('exchange')">Exchange Example</button>
    `;
    presetDiv.style.marginTop = '10px';
    form.appendChild(presetDiv);
}

function setPreset(type) {
    const rabbitmqUrl = document.querySelector('input[name="rabbitmqUrl"]');
    const exchangeName = document.querySelector('input[name="exchangeName"]');
    const routingKey = document.querySelector('input[name="routingKey"]');
    const queueName = document.querySelector('input[name="queueName"]');
    const message = document.querySelector('textarea[name="message"]');

    switch(type) {
        case 'test':
            rabbitmqUrl.value = 'amqp://localhost';
            exchangeName.value = '';
            routingKey.value = '';
            queueName.value = 'test';
            message.value = 'Test message from naja-pusher';
            break;
        case 'eventbus':
            rabbitmqUrl.value = 'amqp://guest:guest@localhost';
            exchangeName.value = '';
            routingKey.value = '';
            queueName.value = 'sol.hub.ehr-measurements';
            message.value = JSON.stringify({
                type: 'measurement',
                patientId: '12345',
                value: 120,
                unit: 'mmHg',
                timestamp: new Date().toISOString()
            }, null, 2);
            break;
        case 'exchange':
            rabbitmqUrl.value = 'amqp://localhost';
            exchangeName.value = 'notifications';
            routingKey.value = 'email.user';
            queueName.value = 'email_queue';
            message.value = JSON.stringify({
                to: 'user@example.com',
                subject: 'Test Notification',
                body: 'This is a test message via exchange'
            }, null, 2);
            break;
    }
}
