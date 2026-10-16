// Local-only supervisor. Dependencies are injected so recovery can be tested
// without terminating a real tunnel or touching the live database.
export class TunnelSupervisor {
  constructor({ probe, portOpen, launch, log, now = Date.now }) {
    Object.assign(this, { probe, portOpen, launch, log, now });
    this.child = null;
    this.ready = false;
    this.stopped = false;
    this.failures = 0;
    this.nextCheck = 0;
    this.lastMessage = '';
  }
  message(value) {
    if (value !== this.lastMessage) this.log(value);
    this.lastMessage = value;
  }
  async tick() {
    if (this.stopped || this.now() < this.nextCheck) return this.ready;
    const result = await this.probe();
    if (this.stopped) return false;
    if (result === 'ok') {
      this.message(this.ready ? 'Database connection healthy.' : 'Encrypted database connection ready.');
      this.ready = true;
      this.failures = 0;
      this.nextCheck = this.now() + 15000;
      return true;
    }
    this.ready = false;
    this.failures++;
    this.nextCheck = this.now() + Math.min(30000, 2000 * 2 ** Math.min(this.failures - 1, 4));
    if (result !== 'unreachable') {
      this.message('Database check failed (credentials, TLS, schema, or server configuration). Tunnel settings were not changed; run npm run db:check for details.');
      this.nextCheck = this.now() + 30000;
      return false;
    }
    if (this.child?.alive()) {
      // Replace only our own tunnel. Never terminate a user's existing process.
      await this.child.stop();
      this.child = null;
    }
    if (this.stopped) return false;
    if (await this.portOpen()) {
      this.message('Database unavailable through an existing tunnel. Waiting for it to recover or release port 13307; it will not be killed.');
      return false;
    }
    if (this.stopped) return false;
    this.message('Database tunnel unavailable. Reconnecting automatically…');
    this.child = this.launch(reason => {
      if (this.stopped) return;
      if (reason === 'authentication') {
        this.message('SSH key needs attention. In another terminal run: ssh-add ~/.ssh/unsaidbox_tunnel (enter the key passphrase there). Recovery will retry automatically.');
        this.nextCheck = this.now() + 30000;
      } else if (reason === 'host-key') {
        this.message('SSH host verification failed. Verify the VPS host key before continuing; host verification will not be bypassed.');
        this.nextCheck = this.now() + 30000;
      } else this.message('SSH connection ended. Automatic recovery will retry.');
    });
    return false;
  }
  async stop() {
    this.stopped = true;
    this.ready = false;
    await this.child?.stop();
    this.child = null;
  }
}

export function sshFailure(stderr) {
  if (/Host key verification failed|REMOTE HOST IDENTIFICATION HAS CHANGED/i.test(stderr)) return 'host-key';
  if (/Permission denied|Load key|no such identity/i.test(stderr)) return 'authentication';
  return 'network';
}
