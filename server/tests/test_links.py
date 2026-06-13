import subprocess
import json

links = {
    "Vimeo": [
        "https://vimeo.com/22439234",
        "https://vimeo.com/78058789",
        "https://vimeo.com/353963017"
    ],
    "SoundCloud": [
        "https://soundcloud.com/postmalone/rockstar-feat-21-savage",
        "https://soundcloud.com/octobersveryown/drake-back-to-back-freestyle",
        "https://soundcloud.com/uiceheidd/lucid-dreams-forget-me"
    ],
    "Facebook": [
        "https://www.facebook.com/facebook/videos/10153231379946729/",
        "https://www.facebook.com/NASA/videos/10156096531121772/",
        "https://www.facebook.com/watch/?v=1833590480036666"
    ],
    "Reddit": [
        "https://www.reddit.com/r/aww/comments/16n6t8o/my_dog_seeing_me_after_a_week/",
        "https://www.reddit.com/r/Damnthatsinteresting/comments/16n6v0x/the_way_this_guy_cuts_this_tree/",
        "https://www.reddit.com/r/NatureIsFuckingLit/comments/16n8r5e/a_beautiful_black_panther/"
    ]
}

def check(url):
    res = subprocess.run(["yt-dlp", "--dump-json", "--no-warnings", url], capture_output=True, text=True)
    if res.returncode == 0:
        d = json.loads(res.stdout)
        return True, d.get('title')
    return False, res.stderr.split('\n')[0]

print("Testing links...")
for plat, urls in links.items():
    print(f"\n--- {plat} ---")
    for u in urls:
        ok, msg = check(u)
        if ok:
            print(f"[OK] {u} - {msg}")
        else:
            print(f"[FAIL] {u} - {msg}")

