const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const sns = new SNSClient({ region: 'us-east-1' });

const TOPIC_ARN = 'arn:aws:sns:us-east-1:599723480138:task-events-topic';
// use your AWS region


const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// In-memory storage
let tasks = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Create task
app.post('/tasks', async (req, res) => {
  const task = {
    id: uuidv4(),
    title: req.body.title,
    completed: false
  };

  tasks.push(task);

  // send SQS message
  try {
    await sns.send(new PublishCommand({
  TopicArn: TOPIC_ARN,
  Message: JSON.stringify({
    event: 'task_created',
    task
  })
}));

    console.log("Message sent to SNS");
  } catch (err) {
    console.error("Failed to send SNS message", err);
  }

  res.status(201).json(task);
});


// Get all tasks
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// Get task by ID
app.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.json(task);
});

// Update task
app.put('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Not found' });
  }
  task.title = req.body.title ?? task.title;
  task.completed = req.body.completed ?? task.completed;
  res.json(task);
});

// Delete task
app.delete('/tasks/:id', (req, res) => {
  tasks = tasks.filter(t => t.id !== req.params.id);
  res.json({ message: 'Deleted', id: req.params.id });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

