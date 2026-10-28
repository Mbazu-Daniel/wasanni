# Deploying Wasanni

## File descriptors

Every websocket, keep-alive connection and file handle counts against the process
file descriptor limit. Linux ships a soft limit of 1024 or 4096 by default, which
the realtime gateway exhausts long before it runs out of memory.

Three places set the limit, and they are not redundant:

- the shell: `ulimit -n 1048576` covers the interactive session only
- `/etc/security/limits.conf`: covers PAM sessions

  ```
  wasanni soft nofile 1048576
  wasanni hard nofile 1048576
  ```

- the systemd unit: covers the service, which systemd starts from PID 1 with its
  own limits. `deploy/wasanni-api.service` sets `LimitNOFILE=1048576:1048576` and
  `TasksMax=infinity`. Copy it to `/etc/systemd/system/wasanni-{api,worker,realtime}.service`
  and change `Description` and `ExecStart`.

`/etc/systemd/system.conf` sets the default for every unit that does not override
it:

```
DefaultLimitNOFILE=1048576:1048576
```

Changing only the shell limit passes every manual test and still fails under
systemd.

Docker cannot raise the host limit, it can only ask for one, so every service in
`docker-compose.prod.yml` carries `ulimits.nofile`.

## PgBouncer

`docker-compose.yml` runs PgBouncer in transaction mode on 6432. Point
`DATABASE_URL` at it and `createDb` sets `prepare: false` on its own, because
postgres-js prepares statements by default and a transaction-mode pooler hops the
client between backends, so a cached prepared statement stops existing. The
symptom is `FATAL 08P01 prepared statement "..." does not exist` on every
in-flight query after a backend rotates.

`isPooled` treats ports 6432 and 6543, `?pgbouncer=true` and `?prepare=false` as
pooled.

With a pooler in front, keep the per-process pool small (`DB_POOL_MAX` and its
worker and realtime siblings, default 10/5/5). The pooler multiplexes onto the
real backend, so a large per-process pool multiplies into more backend
connections, not more throughput.

## Redis

BullMQ needs `maxmemory-policy noeviction`. Every other policy can evict queue
keys under memory pressure and silently drop jobs, so the policy is a correctness
requirement, not a tuning preference. `docker-compose.yml` sets `noeviction`,
`appendonly yes` and `appendfsync everysec`.

Each app runs `preflight` before it connects: it reads `ulimit -n` and the Redis
policy, logs a warning outside production, and refuses to start in production when
either is wrong. `FD_LIMIT_MINIMUM` sets the fd-limit threshold.
