## Deploying the Docsify Server

### Build the Docker Image and push to ECR


## Normal public doc
```bash
docker build -t 010438490142.dkr.ecr.us-east-1.amazonaws.com/raac-docs:latest-amd64 -f dockerfiles/docs.Dockerfile .
docker run -p 3000:3000 010438490142.dkr.ecr.us-east-1.amazonaws.com/raac-docs:latest-amd64
``` 

## Password protected docs: 

```
docker build -t raac-docs-nginx -f dockerfiles/docs.protected.Dockerfile .
docker run -p 8080:80 -e NGINX_USER=user -e NGINX_PASS=readytoraac raac-docs-nginx
```


### Specifics for AMD (AWS has multiple architectures):

```bash
docker build -t 010438490142.dkr.ecr.us-east-1.amazonaws.com/raac-docs:latest-amd64 --platform linux/amd64 -f dockerfiles/docs.Dockerfile .
docker push 010438490142.dkr.ecr.us-east-1.amazonaws.com/raac-docs:latest-amd64
```

### Load & Run the Docker Image

```bash
docker pull 010438490142.dkr.ecr.us-east-1.amazonaws.com/raac-docs:latest-amd64
docker run -p 3000:3000 010438490142.dkr.ecr.us-east-1.amazonaws.com/raac-docs:latest-amd64
```

### Deploy using Amplify

Amplify will automatically build and deplot using the `amplify.yml` file.  
This will only spawn an instance of the `/docs` directory. 