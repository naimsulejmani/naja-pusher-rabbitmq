// Add some interactive functionality for the RabbitMQ and Mirth forms
document.addEventListener('DOMContentLoaded', function() {
    const rabbitForm = document.querySelector('form[action="/publish"]');
    const mirthForm = document.querySelector('form[action="/send-mirth"]');
    
    // RabbitMQ form handling
    if (rabbitForm) {
        const exchangeInput = rabbitForm.querySelector('input[name="exchangeName"]');
        const routingKeyInput = rabbitForm.querySelector('input[name="routingKey"]');
        const queueInput = rabbitForm.querySelector('input[name="queueName"]');

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
        rabbitForm.addEventListener('submit', function(e) {
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
            const submitBtn = rabbitForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
        });

        // Add preset buttons for RabbitMQ
        addRabbitMQPresetButtons();
    }

    // Mirth form handling
    if (mirthForm) {
        // Form validation
        mirthForm.addEventListener('submit', function(e) {
            const hl7Message = mirthForm.querySelector('textarea[name="hl7Message"]').value.trim();
            
            // Basic HL7 validation
            if (!hl7Message.startsWith('MSH|')) {
                const proceed = confirm('Message doesn\'t start with MSH segment. Continue anyway?');
                if (!proceed) {
                    e.preventDefault();
                    return false;
                }
            }

            // Show loading state
            const submitBtn = mirthForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Sending HL7...';
            submitBtn.disabled = true;
        });

        // Add preset buttons for Mirth
        addMirthPresetButtons();
    }
});

function addRabbitMQPresetButtons() {
    const form = document.querySelector('form[action="/publish"]');
    const presetDiv = document.createElement('div');
    presetDiv.innerHTML = `
        <div class="mb-3">
            <label class="form-label">Quick Presets:</label>
            <div class="btn-group w-100" role="group">
                <button type="button" class="btn btn-outline-secondary" onclick="setRabbitMQPreset('test')">Test Queue</button>
                <button type="button" class="btn btn-outline-secondary" onclick="setRabbitMQPreset('eventbus')">EventBus Config</button>
                <button type="button" class="btn btn-outline-secondary" onclick="setRabbitMQPreset('exchange')">Exchange Example</button>
                <button type="button" class="btn btn-outline-warning" onclick="setRabbitMQPreset('loadtest')">Load Test (100x)</button>
            </div>
        </div>
    `;
    form.appendChild(presetDiv);
}

function addMirthPresetButtons() {
    const form = document.querySelector('form[action="/send-mirth"]');
    const presetDiv = document.createElement('div');
    presetDiv.innerHTML = `
        <div class="mb-3">
            <label class="form-label">HL7 Message Presets:</label>
            <div class="btn-group w-100" role="group">
                <button type="button" class="btn btn-outline-info" onclick="setMirthPreset('adt')">ADT Message</button>
                <button type="button" class="btn btn-outline-info" onclick="setMirthPreset('oru')">ORU Lab Result</button>
                <button type="button" class="btn btn-outline-info" onclick="setMirthPreset('orm')">ORM Order</button>
            </div>
        </div>
    `;
    form.appendChild(presetDiv);
}

function setRabbitMQPreset(type) {
    const rabbitmqUrl = document.querySelector('input[name="rabbitmqUrl"]');
    const exchangeName = document.querySelector('input[name="exchangeName"]');
    const routingKey = document.querySelector('input[name="routingKey"]');
    const queueName = document.querySelector('input[name="queueName"]');
    const message = document.querySelector('textarea[name="message"]');
    const repeatCount = document.querySelector('input[name="repeatCount"]');

    switch(type) {
        case 'test':
            rabbitmqUrl.value = 'amqp://localhost';
            exchangeName.value = '';
            routingKey.value = '';
            queueName.value = 'test';
            message.value = 'Test message from naja-pusher';
            repeatCount.value = '1';
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
            repeatCount.value = '1';
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
            repeatCount.value = '1';
            break;
        case 'loadtest':
            rabbitmqUrl.value = 'amqp://localhost';
            exchangeName.value = '';
            routingKey.value = '';
            queueName.value = 'test';
            message.value = 'Load test message';
            repeatCount.value = '100';
            break;
    }
}

function setMirthPreset(type) {
    const mirthHost = document.querySelector('input[name="mirthHost"]');
    const mirthPort = document.querySelector('input[name="mirthPort"]');
    const hl7Message = document.querySelector('textarea[name="hl7Message"]');
    const parseHl7 = document.querySelector('input[name="parseHl7"]');

    const currentDate = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
    const controlId = Math.floor(Math.random() * 100000);

    mirthHost.value = 'localhost';
    mirthPort.value = '6661';
    parseHl7.checked = true;

    switch(type) {
        case 'adt':
            hl7Message.value = `MSH|^~\\&|HOSPITAL_SYSTEM|MAIN_FACILITY|MIRTH|RECEIVING_APP|${currentDate}||ADT^A08^ADT_A08|${controlId}|P|2.5\r` +
                              `EVN||${currentDate}|||^SYSTEM\r` +
                              `PID|1||12345^^^HOSPITAL^MR~987654321^^^NATIONAL^SS||DOE^JOHN^MIDDLE^^MR||19850101|M|||123 MAIN ST^^CITY^ST^12345^USA||(555)123-4567|(555)987-6543||S||12345|987654321\r` +
                              `NK1|1|DOE^JANE^||SPOUSE||||||||||||||||||||||||||||||||||||||||||||||||||||\r` +
                              `PV1|1|I|ICU^101^1^HOSPITAL||||||^DOC^ATTENDING|||||||V||||||||||||||||||||||||${currentDate}`;
            break;
        case 'oru':
            hl7Message.value = `MSH|^~\\&|LAB_SYSTEM|LAB_FACILITY|MIRTH|RECEIVING_APP|${currentDate}||ORU^R01^ORU_R01|${controlId}|P|2.5\r` +
                              `PID|1||12345^^^HOSPITAL^MR||DOE^JOHN^MIDDLE^^MR||19850101|M|||123 MAIN ST^^CITY^ST^12345^USA||(555)123-4567\r` +
                              `OBR|1|ORDER123|RESULT456|CBC^COMPLETE BLOOD COUNT^L|||${currentDate}|||||||||^DOC^ORDERING||||||${currentDate}|||F\r` +
                              `OBX|1|NM|WBC^WHITE BLOOD COUNT^L||7.5|10*3/uL|4.0-11.0|N|||F\r` +
                              `OBX|2|NM|RBC^RED BLOOD COUNT^L||4.2|10*6/uL|3.8-5.2|N|||F\r` +
                              `OBX|3|NM|HGB^HEMOGLOBIN^L||14.0|g/dL|12.0-16.0|N|||F`;
            break;
        case 'orm':
            hl7Message.value = `MSH|^~\\&|ORDER_SYSTEM|ORDER_FACILITY|MIRTH|RECEIVING_APP|${currentDate}||ORM^O01^ORM_O01|${controlId}|P|2.5\r` +
                              `PID|1||12345^^^HOSPITAL^MR||DOE^JOHN^MIDDLE^^MR||19850101|M|||123 MAIN ST^^CITY^ST^12345^USA||(555)123-4567\r` +
                              `PV1|1|O|OUTPATIENT||||||||||||||||V||||||||||||||||||||||||${currentDate}\r` +
                              `ORC|NW|ORDER789||||||${currentDate}|||^DOC^ORDERING\r` +
                              `OBR|1|ORDER789||XRAY^CHEST X-RAY^L|||${currentDate}||||||||^DOC^ORDERING||||||${currentDate}|||F`;
            break;
    }
}
