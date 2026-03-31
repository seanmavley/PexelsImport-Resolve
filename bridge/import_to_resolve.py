#!/usr/bin/env python3
"""
Pexels Browser — DaVinci Resolve Auto-Import Bridge
Imports downloaded video files into the current DaVinci Resolve Media Pool.

Usage:
    python3 import_to_resolve.py --file /path/to/video.mp4
    python3 import_to_resolve.py --watch /path/to/downloads/folder
"""

import sys
import os
import time
import argparse

def get_resolve():
    """Connect to running DaVinci Resolve instance."""
    try:
        # Try to import the Resolve scripting module
        script_module = None

        # Method 1: Environment variable path
        resolve_script_api = os.environ.get('RESOLVE_SCRIPT_API', '')
        if resolve_script_api:
            sys.path.append(resolve_script_api)

        # Method 2: Standard install paths
        standard_paths = [
            # Linux
            '/opt/resolve/Developer/Scripting/Modules/',
            '/opt/resolve/libs/Fusion/Modules/',
            # Windows
            os.path.join(os.environ.get('PROGRAMDATA', ''), 
                        'Blackmagic Design', 'DaVinci Resolve', 'Support', 
                        'Developer', 'Scripting', 'Modules'),
            # macOS
            '/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules/',
        ]
        for p in standard_paths:
            if os.path.isdir(p) and p not in sys.path:
                sys.path.append(p)

        import DaVinciResolveScript as dvr
        resolve = dvr.scriptapp('Resolve')
        return resolve

    except ImportError as e:
        print(f"[Bridge] Error: DaVinci Resolve scripting module not found: {e}", file=sys.stderr)
        print("[Bridge] Make sure RESOLVE_SCRIPT_API environment variable is set correctly.", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[Bridge] Error connecting to Resolve: {e}", file=sys.stderr)
        return None


def import_file(resolve, filepath):
    """Import a single file into the current Media Pool."""
    if not resolve:
        print(f"[Bridge] Resolve not connected. Cannot import {filepath}", file=sys.stderr)
        return False

    try:
        project_manager = resolve.GetProjectManager()
        project = project_manager.GetCurrentProject()
        
        if not project:
            print("[Bridge] No project is currently open.", file=sys.stderr)
            return False

        media_pool = project.GetMediaPool()
        
        if not media_pool:
            print("[Bridge] Could not access Media Pool.", file=sys.stderr)
            return False

        # Find or create a "Pexels" folder in the Media Pool
        root_folder = media_pool.GetRootFolder()
        pexels_folder = None
        
        for subfolder in root_folder.GetSubFolderList():
            if subfolder.GetName() == 'Pexels Downloads':
                pexels_folder = subfolder
                break
        
        if not pexels_folder:
            pexels_folder = media_pool.AddSubFolder(root_folder, 'Pexels Downloads')
        
        if pexels_folder:
            media_pool.SetCurrentFolder(pexels_folder)

        # Import the file
        items = media_pool.ImportMedia([filepath])
        
        if items and len(items) > 0:
            print(f"[Bridge] Successfully imported: {os.path.basename(filepath)}")
            return True
        else:
            print(f"[Bridge] Failed to import: {filepath}", file=sys.stderr)
            return False

    except Exception as e:
        print(f"[Bridge] Import error: {e}", file=sys.stderr)
        return False


def watch_folder(resolve, folder_path, interval=2):
    """Watch a folder for new .mp4 files and auto-import them."""
    print(f"[Bridge] Watching folder: {folder_path}")
    print(f"[Bridge] Checking every {interval}s for new files...")
    
    imported = set()
    
    # Pre-populate with existing files so we don't re-import them
    if os.path.isdir(folder_path):
        for f in os.listdir(folder_path):
            if f.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
                imported.add(os.path.join(folder_path, f))
    
    try:
        while True:
            if not os.path.isdir(folder_path):
                time.sleep(interval)
                continue
            
            for filename in os.listdir(folder_path):
                if not filename.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
                    continue
                
                filepath = os.path.join(folder_path, filename)
                
                if filepath in imported:
                    continue
                
                # Wait a moment to ensure file is fully written
                time.sleep(1)
                
                # Check if file is still being written
                size1 = os.path.getsize(filepath)
                time.sleep(0.5)
                size2 = os.path.getsize(filepath)
                
                if size1 != size2:
                    continue  # Still downloading
                
                print(f"[Bridge] New file detected: {filename}")
                
                # Reconnect to Resolve (in case it was restarted)
                if not resolve:
                    resolve = get_resolve()
                
                success = import_file(resolve, filepath)
                if success:
                    imported.add(filepath)
                
            time.sleep(interval)
    
    except KeyboardInterrupt:
        print("\n[Bridge] Stopped watching.")


def main():
    parser = argparse.ArgumentParser(
        description='Pexels Browser — DaVinci Resolve Auto-Import Bridge'
    )
    parser.add_argument('--file', type=str, help='Import a single file into the Media Pool')
    parser.add_argument('--watch', type=str, help='Watch a folder and auto-import new videos')
    parser.add_argument('--interval', type=int, default=2, help='Watch interval in seconds (default: 2)')
    
    args = parser.parse_args()
    
    if not args.file and not args.watch:
        parser.print_help()
        print("\nExamples:")
        print("  python3 import_to_resolve.py --file /path/to/video.mp4")
        print("  python3 import_to_resolve.py --watch /home/user/Desktop")
        sys.exit(1)
    
    resolve = get_resolve()
    
    if not resolve:
        print("[Bridge] Warning: Could not connect to DaVinci Resolve.")
        print("[Bridge] Make sure Resolve is running and scripting is enabled.")
        if args.watch:
            print("[Bridge] Will keep trying to connect...")
        else:
            sys.exit(1)
    
    if args.file:
        filepath = os.path.abspath(args.file)
        if not os.path.isfile(filepath):
            print(f"[Bridge] File not found: {filepath}", file=sys.stderr)
            sys.exit(1)
        success = import_file(resolve, filepath)
        sys.exit(0 if success else 1)
    
    if args.watch:
        folder = os.path.abspath(args.watch)
        if not os.path.isdir(folder):
            print(f"[Bridge] Folder not found: {folder}", file=sys.stderr)
            sys.exit(1)
        watch_folder(resolve, folder, args.interval)


if __name__ == '__main__':
    main()
