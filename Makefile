.PHONY: all generate test clean test-radiance

# Default target
all: generate

# Generate the parser C code from grammar.js
generate:
	tree-sitter generate

# Run standard tree-sitter tests (if corpus exists)
test: generate
	tree-sitter test

# Clone radiance compiler repository and test grammar against all .rad files
test-radiance: generate
	@echo "Looking for radiance compiler tests..."
	@if [ ! -d "radiance" ]; then \
		echo "Cloning radiance to ./radiance..."; \
		git clone https://code.radiant.computer/radiance.git; \
	fi; \
	echo "Testing grammar against all .rad files in radiance..."; \
	find radiance -name "*.rad" -exec sh -c 'tree-sitter parse -q "$$1"' _ {} \; ; \
	echo "Done testing radiance files."

# Clean generated files
clean:
	rm -rf binding.gyp build/ radiance/
