import app from './app';
import { config } from './config/env';
// start background workers (register processors)
import './workers/report.worker';

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
