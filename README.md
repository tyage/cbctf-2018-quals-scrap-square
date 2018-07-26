# cbctf-scrap-square

Create ./config.js and ./flag

```sh
$ docker build -t scrap-square .
$ docker run -p 3000:3000 --cap-add=SYS_ADMIN --rm --name scrap-square scrap-square
```

## Dependencies for admin browser

https://github.com/Googlechrome/puppeteer/issues/290#issuecomment-322838700
