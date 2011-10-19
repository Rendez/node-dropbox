#!/usr/bin/python

from mechanize import Browser, FormNotFoundError
import sys
import json

def login_and_authorize(argv=None):
    if argv is None:
       argv = sys.argv
    
    authorize_url = argv[1]
    config = json.loads(argv[2])
    
    print "AUTHORIZING", authorize_url
    br = Browser()
    br.set_debug_redirects(True)
    br.open(authorize_url)
    
    print "FIRST PAGE", br.title(), br.geturl()
    br.select_form(nr=2)
    br["login_email"] = config[u"testing_user"]
    br["login_password"] = config[u"testing_password"]

    resp = br.submit()
    print "RESULT PAGE TITLE", br.title()
    print "RESULT URL", resp.geturl()

    assert br.viewing_html(), "Looks like it busted."

    try:
        br.select_form(nr=2)
        br.submit()
        assert br.viewing_html(), "Looks like it busted."
        assert "API Request Authorized" in br.title(), "Title Is Wrong (bad email/password?): %r at %r" % (br.title(), br.geturl())
    except FormNotFoundError:
        print "Looks like we're blessed."
    
    return "OK"

sys.exit(login_and_authorize())
