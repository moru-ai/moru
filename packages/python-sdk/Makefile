ROOT_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)

generate-api:
	python $(ROOT_DIR)/spec/remove_extra_tags.py sandboxes templates
	openapi-python-client generate --output-path $(ROOT_DIR)/packages/python-sdk/moru/api/api --overwrite --path $(ROOT_DIR)/spec/openapi_generated.yml
	rm -rf moru/api/client
	mv moru/api/api/moru_api_client moru/api/client
	rm -rf moru/api/api
	ruff format .

generate-envd:
	if [ ! -f "/go/bin/protoc-gen-connect-python" ]; then \
		$(MAKE) -C $(ROOT_DIR)/packages/connect-python build; \
	fi

	cd $(ROOT_DIR)/spec/envd && pwd && buf generate --template buf-python.gen.yaml
	./scripts/fix-python-pb.sh

	ruff format .

generate: generate-api generate-envd generate-mcp

init:
	pip install openapi-python-client datamodel-code-generator

lint:
	ruff check .

format:
	ruff format .

generate-mcp:
	datamodel-codegen \
			--input ../../spec/mcp-server.json \
			--input-file-type jsonschema \
			--output moru/sandbox/mcp.py \
			--output-model-type typing.TypedDict \
			--target-python-version 3.9 \
			--class-name McpServer \
			--use-field-description \
			--disable-timestamp \
			--extra-fields forbid

.PHONY: setup
setup:
	poetry install

.PHONY: test
test: setup
	poetry run pytest --verbose --numprocesses=4
