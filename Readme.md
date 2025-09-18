# Streambox - DevSecOps Project

A Netflix-style streaming application demonstrating comprehensive DevOps practices with Docker, Kubernetes (Minikube), Jenkins CI/CD, security scanning, and monitoring on Ubuntu Linux.

## 🚀 Features

**Application:**
- Streambox interface with hover modals and video player
- React 18 + TypeScript + Material-UI
- TMDB API integration for movie data

**DevOps Pipeline:**
- 🐳 Docker containerization with multi-stage builds
- ☸️ Kubernetes deployment using Minikube
- 🔄 Jenkins CI/CD automation
- 🛡️ Security scanning (SonarQube, OWASP, Trivy)
- 📊 Monitoring (Prometheus + Grafana)

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, MUI, Redux Toolkit
- **Containerization**: Docker, Minikube, Kubernetes
- **CI/CD**: Jenkins, SonarQube, OWASP Dependency Check, Trivy
- **Monitoring**: Prometheus, Grafana, Node Exporter
- **Registry**: Docker Hub (abhigyop/netflix)
- **Platform**: Ubuntu Linux 20.04+

## ⚡ Quick Setup (Ubuntu Linux)

### 1. System Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io -y
sudo usermod -aG docker $USER
newgrp docker
sudo chmod 777 /var/run/docker.sock

# Install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Install kubectl
sudo snap install kubectl --classic
```

### 2. Get TMDB API Key
1. Visit [TMDB Website](https://www.themoviedb.org/)
2. Create account and login
3. Go to Settings → API
4. Create new API key
5. Save your API key for Docker build

### 3. Deploy Application
```bash
# Start Minikube
minikube start --driver=docker --cpus=2 --memory=4096

# Clone project
git clone https://github.com/abhiguop/netflix.git
cd netflix

# Build and test Docker image
docker build --build-arg TMDB_V3_API_KEY=your_api_key -t abhigyop/netflix:latest .
docker run -d -p 8081:80 --name netflix-test abhigyop/netflix:latest

# Deploy to Kubernetes
kubectl apply -f kubernetes/deployment.yml
kubectl apply -f kubernetes/service.yml

# Access application
minikube service netflix-service
```

## 🔧 Phase 1: Security Setup

### Install SonarQube (Ubuntu)
```bash
# Run SonarQube container
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community

# Access SonarQube
# URL: http://localhost:9000
# Default credentials: admin/admin
```

### Install Trivy Scanner
```bash
# Install Trivy
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# Scan Docker image
trivy image abhigyop/netflix:latest
```

## 🔄 Phase 2: Jenkins CI/CD Setup

### Install Jenkins (Ubuntu)
```bash
# Install Java 17
sudo apt update
sudo apt install fontconfig openjdk-17-jre -y
java -version

# Install Jenkins
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update
sudo apt-get install jenkins -y

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Access Jenkins: http://localhost:8080
```

### Configure Jenkins Plugins
Install these plugins in Jenkins:
- Eclipse Temurin Installer
- SonarQube Scanner
- NodeJs Plugin
- OWASP Dependency-Check
- Docker Pipeline

### Jenkins Pipeline Configuration
```groovy
pipeline {
    agent any
    tools {
        jdk 'jdk17'
        nodejs 'node16'
    }
    environment {
        SCANNER_HOME = tool 'sonar-scanner'
    }
    stages {
        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }
        stage('Checkout from Git') {
            steps {
                git branch: 'main', url: 'https://github.com/abhiguop/netflix-clone.git'
            }
        }
        stage("SonarQube Analysis") {
            steps {
                withSonarQubeEnv('sonar-server') {
                    sh '''$SCANNER_HOME/bin/sonar-scanner -Dsonar.projectName=Streambox \
                    -Dsonar.projectKey=Streambox'''
                }
            }
        }
        stage("Quality Gate") {
            steps {
                script {
                    waitForQualityGate abortPipeline: false, credentialsId: 'Sonar-token'
                }
            }
        }
        stage('Install Dependencies') {
            steps {
                sh "npm install"
            }
        }
        stage('OWASP FS Scan') {
            steps {
                dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit', odcInstallation: 'DP-Check'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }
        stage('Trivy FS Scan') {
            steps {
                sh "trivy fs . > trivyfs.txt"
            }
        }
        stage("Docker Build & Push") {
            steps {
                script {
                    withDockerRegistry(credentialsId: 'docker', toolName: 'docker') {
                        sh "docker build --build-arg TMDB_V3_API_KEY=${env.TMDB_V3_API_KEY} -t abhigyop/netflix ."
                        sh "docker tag abhigyop/netflix abhigyop/netflix:latest"
                        sh "docker push abhigyop/netflix:latest"
                    }
                }
            }
        }
        stage("Trivy Image Scan") {
            steps {
                sh "trivy image abhigyop/netflix:latest > trivyimage.txt"
            }
        }
        stage('Deploy to Minikube') {
            steps {
                script {
                    sh 'kubectl apply -f kubernetes/deployment.yml'
                    sh 'kubectl apply -f kubernetes/service.yml'
                }
            }
        }
    }
}
```

## ☸️ Kubernetes Manifests

**deployment.yml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: netflix-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: netflix-app
  template:
    metadata:
      labels:
        app: netflix-app
    spec:
      containers:
      - name: netflix-app
        image: abhigyop/netflix:latest
        ports:
        - containerPort: 80
```

**service.yml**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: netflix-service
spec:
  type: NodePort
  ports:
  - port: 80
    nodePort: 30007
  selector:
    app: netflix-clone
```

## 📊 Phase 3: Monitoring Setup

### Install Prometheus (Ubuntu)
```bash
# Create Prometheus user
sudo useradd --system --no-create-home --shell /bin/false prometheus

# Download and install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.47.1/prometheus-2.47.1.linux-amd64.tar.gz
tar -xvf prometheus-2.47.1.linux-amd64.tar.gz
cd prometheus-2.47.1.linux-amd64/

# Create directories and move files
sudo mkdir -p /data /etc/prometheus
sudo mv prometheus promtool /usr/local/bin/
sudo mv consoles/ console_libraries/ /etc/prometheus/
sudo mv prometheus.yml /etc/prometheus/prometheus.yml
sudo chown -R prometheus:prometheus /etc/prometheus/ /data/

# Create systemd service
sudo nano /etc/systemd/system/prometheus.service
```

Add this content to prometheus.service:
```ini
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
Restart=on-failure
RestartSec=5s
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/data \
  --web.console.templates=/etc/prometheus/consoles \
  --web.console.libraries=/etc/prometheus/console_libraries \
  --web.listen-address=0.0.0.0:9090 \
  --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
```

```bash
# Start Prometheus
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus

# Access Prometheus: http://localhost:9090
```

### Install Node Exporter
```bash
# Create node_exporter user
sudo useradd --system --no-create-home --shell /bin/false node_exporter

# Download and install
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar -xvf node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter*

# Create systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

Add this content:
```ini
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
Restart=on-failure
RestartSec=5s
ExecStart=/usr/local/bin/node_exporter --collector.logind

[Install]
WantedBy=multi-user.target
```

```bash
# Start Node Exporter
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

### Install Grafana (Ubuntu)
```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y apt-transport-https software-properties-common

# Add Grafana GPG key and repository
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list

# Install Grafana
sudo apt-get update
sudo apt-get install grafana -y

# Start Grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server

# Access Grafana: http://localhost:3000
# Default credentials: admin/admin
```

### Configure Monitoring
```bash
# Update Prometheus config
sudo nano /etc/prometheus/prometheus.yml
```

Add this configuration:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'jenkins'
    metrics_path: '/prometheus'
    static_configs:
      - targets: ['localhost:8080']
```

```bash
# Reload Prometheus
curl -X POST http://localhost:9090/-/reload
```

## 📋 Environment Setup

Create `.env` file:
```env
VITE_APP_API_ENDPOINT_URL=https://api.themoviedb.org/3
VITE_APP_TMDB_V3_API_KEY=your_tmdb_api_key
```

Get TMDB API key from [themoviedb.org](https://www.themoviedb.org/settings/api)

## 🔧 Common Operations

### Docker Management
```bash
# Build and test
docker build --build-arg TMDB_V3_API_KEY=your_key -t abhigyop/netflix:latest .
docker run -d -p 8081:80 --name netflix-test abhigyop/netflix:latest

# Push to registry
docker login
docker push abhigyop/netflix:latest

# Clean up
docker stop netflix-test
docker rm netflix-test
docker rmi abhigyop/netflix:latest
```

### Kubernetes Operations
```bash
# Deploy application
kubectl apply -f kubernetes/
kubectl get pods
kubectl get services

# Update deployment
kubectl set image deployment/netflix netflix=abhigyop/netflix:v2.0
kubectl rollout status deployment/netflix

# Access application
minikube service netflix-service
kubectl port-forward svc/netflix-service 8080:80
```

### Minikube Management
```bash
# Cluster operations
minikube start --driver=docker --cpus=2 --memory=4096
minikube status
minikube stop
minikube delete

# Access services
minikube service netflix-service
minikube service netflix-service --url
minikube dashboard
```

### Monitoring Commands
```bash
# Check services status
sudo systemctl status prometheus
sudo systemctl status node_exporter
sudo systemctl status grafana-server

# View metrics
curl http://localhost:9090/metrics
curl http://localhost:9100/metrics

# Prometheus targets
curl http://localhost:9090/api/v1/targets
```

## 📁 Project Structure

```
netflix/
├── Dockerfile              # Multi-stage build (Node.js → Nginx)
├── kubernetes/              # K8s deployment manifests
│   ├── deployment.yml      # Pod deployment with 2 replicas
│   └── service.yml         # NodePort service (port 30007)
├── Jenkinsfile             # CI/CD pipeline definition
├── src/                    # React TypeScript application
├── public/                 # Static assets
├── package.json            # Dependencies and build scripts
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🎯 DevOps Pipeline Flow

1. **Developer pushes code** → GitHub repository
2. **Jenkins webhook triggers** → Automated pipeline starts
3. **Code quality scan** → SonarQube analysis
4. **Security scanning** → OWASP dependency check + Trivy
5. **Docker build** → Multi-stage container creation
6. **Registry push** → Docker Hub (abhigyop/netflix)
7. **Kubernetes deploy** → Minikube cluster deployment
8. **Monitoring** → Prometheus + Grafana dashboards

## 🛡️ Security Features

- **Code Quality**: SonarQube static analysis
- **Vulnerability Scanning**: Trivy image and filesystem scans
- **Dependency Check**: OWASP dependency vulnerability assessment
- **Container Security**: Non-root user, multi-stage builds
- **Infrastructure**: Kubernetes security policies and resource limits

## 📊 Access URLs

After successful deployment, access these services:

- **Streambox Application**: `minikube service netflix-clone-service --url`
- **Jenkins**: http://localhost:8080
- **SonarQube**: http://localhost:9000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
- **Minikube Dashboard**: `minikube dashboard`

## 🔧 Troubleshooting

### Common Issues

**Docker permission denied**:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Minikube won't start**:
```bash
minikube delete
minikube start --driver=docker --force
```

**Jenkins can't connect to Docker**:
```bash
sudo chmod 666 /var/run/docker.sock
```

**SonarQube memory issues**:
```bash
sudo sysctl -w vm.max_map_count=262144
```

## 📝 Prerequisites

- Ubuntu Linux 20.04+
- Docker installed and running
- Minikube installed
- kubectl installed
- TMDB API key
- 4GB+ RAM for Minikube
- Java 17 for Jenkins

## 🚀 Next Steps

1. **Production Deployment**: Replace Minikube with AWS EKS or GKE
2. **Advanced Monitoring**: Add application metrics and distributed tracing
3. **GitOps**: Implement ArgoCD for GitOps workflows
4. **Multi-Environment**: Set up staging and production environments
5. **Infrastructure as Code**: Add Terraform for cloud infrastructure

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Create Pull Request

## 📄 License

This project is for educational purposes, demonstrating DevOps practices with modern web technologies and streaming applications.

## 📧 Contact

- GitHub: [@abhiguop](https://github.com/abhiguop)
- Project Link: [https://github.com/abhiguop/netflix](https://github.com/abhiguop/netflix)

---

⭐ If you found this project helpful, please give it a star on GitHub!