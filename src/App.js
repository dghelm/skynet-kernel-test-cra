import { useState, useEffect } from 'react';

// Array of tests and names imported to tidy code
import { testCardValues } from './testMethods';

// TestCard is a react component that runs a test and reports the result.
function TestCard({
  name: testName,
  test,
  queueSpot,
  queueTurn,
  setQueueTurn,
}) {
  const [testStatus, setTestStatus] = useState('test is waiting');
  const [statusColor, setStatusColor] = useState('rgba(60, 60, 60, 0.6)');
  const [duration, setDuration] = useState(0);

  // runs each time queueTurn is updated and sees if this card's
  // queue spot matches it.
  useEffect(() => {
    if (queueTurn === queueSpot) {
      setTestStatus('test is running');
      setStatusColor('rgba(255, 165, 0, 0.6)');
      let start = performance.now();
      test()
        .then((x) => {
          setTestStatus('test success: ' + x);
          setStatusColor('rgba(0, 80, 0, 0.6)');
          setDuration(performance.now() - start);
          setQueueTurn(queueTurn + 1);
        })
        .catch((x) => {
          console.error(x);
          setTestStatus(x);
          setStatusColor('rgba(255, 0, 0, 0.6)');
          let end = performance.now();
          setDuration(end - start);
          setQueueTurn(queueTurn + 1);
        });
    }
  }, [test, queueTurn, setQueueTurn, queueSpot]);

  return (
    <div
      style={{
        border: '1px solid black',
        backgroundColor: statusColor,
        margin: '12px',
        padding: '6px',
      }}
    >
      <p>{testName}</p>
      <p>{testStatus}</p>
      <p>{duration}ms</p>
    </div>
  );
}

// Establish the index page.
const App = () => {
  const [queueTurn, setQueueTurn] = useState(0);

  const queue = { queueTurn, setQueueTurn };

  // Render each testCardValue with a TestCard
  const testCards = testCardValues.map((test, index) => (
    <TestCard key={index} queueSpot={index} {...test} {...queue} />
  ));

  return (
    <main>
      <title>Libkernel Test Suite</title>
      <h1>Running Tests</h1>

      {testCards}
    </main>
  );
};

export default App;
