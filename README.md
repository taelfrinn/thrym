
## TODO
* Wrap all crud dao actions and calls into a db exception catcher ?
* its preferable to log SQL errors rather than leak them to all response messages
* the log and sanitize option is not easy with the current setup, since cruddao has no logger
* change it to have a logger and trap all db errors into logs

## INSTALLATION

	npm install --save 'https://github.com/taelfrinn/thrym#0.0.3'

For docker builds this wont work; consider copying individual files?
