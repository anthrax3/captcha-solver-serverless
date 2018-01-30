Captcha Solver
--------------

Solve captcha image with two step process: preprocess (with Imagemagick) and OCR (with Tesseract).

Install
-------

Run serverless deploy
    
    sls deploy -s
    
Test
----

Send POST request to API endpoint, with this payload

	{
  	    "url" : "https://ib.bri.co.id/ib-bri/login/captcha",
  	    "preprocess" : "-flatten -fuzz 20% -trim +repage -white-threshold 5000 -type bilevel"	
	}

or
    
    
Send POST request to API endpoint, with this payload

	{
  	    "base64" : "data:image/PNG;base64,...",
  	    "preprocess" : "-flatten -fuzz 20% -trim +repage -white-threshold 5000 -type bilevel"	
	}
	
	