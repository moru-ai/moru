FROM ubuntu:22.04

# 비대화형 설치를 위한 환경변수
ENV DEBIAN_FRONTEND=noninteractive

# 여러 셸과 필요한 도구 설치
RUN apt-get update && apt-get install -y \
    bash \
    zsh \
    fish \
    curl \
    file \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /test

# 설치 스크립트와 테스트 스크립트 복사
COPY install.sh /test/install.sh
COPY test-linux.sh /test/test-linux.sh
RUN chmod +x /test/install.sh /test/test-linux.sh

# 기본 셸을 bash로 설정
CMD ["/bin/bash"]
