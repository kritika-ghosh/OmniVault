import sys
import os

# Smart wrapper to load real ZeroGPU 'spaces' library on Hugging Face,
# or fall back to a mock decorator when running locally.

# 1. Temporarily pop the local 'spaces' module from sys.modules to prevent circular import resolution
our_module = sys.modules.pop("spaces", None)

# 2. Temporarily clean sys.path to exclude local folders
original_path = sys.path.copy()
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path = [p for p in sys.path if p != current_dir and p != ""]

try:
    # 3. Import the system-level 'spaces' module
    import spaces as real_spaces
    
    # 4. Restore our local module to sys.modules so the caller gets this wrapped module
    if our_module:
        sys.modules["spaces"] = our_module
        
    # 5. Expose system module attributes
    globals().update(real_spaces.__dict__)
    GPU = real_spaces.GPU
except ImportError:
    # Restore local module to sys.modules on failure
    if our_module:
        sys.modules["spaces"] = our_module
        
    # Fallback mock decorator for local development
    def GPU(func):
        return func
finally:
    # Restore original path list
    sys.path = original_path
