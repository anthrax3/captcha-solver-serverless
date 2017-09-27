# reference:
# https://stackoverflow.com/questions/33588262/tesseract-ocr-on-aws-lambda-via-virtualenv/35724894#35724894
# http://www.imagemagick.org/discourse-server/viewtopic.php?t=11137

#  on Ubuntu 14
1.
    sudo apt-get update
    
2.    
    sudo apt-get -y install autoconf automake libtool libleptonica-dev autoconf-archive libpng-dev libpng12-dev 
        libjpeg-dev libjpeg8-dev libtiff5-dev libtiff-dev zlib1g-dev gcc g++ 
        checkinstall pkg-config build-essential tcl

3. 
    wget http://www.leptonica.com/source/leptonica-1.74.4.tar.gz
    tar xvf leptonica-1.74.4.tar.gz
    cd leptonica-1.74.4
    ./configure
    make
    sudo make install
    sudo ldconfig

4.
    git clone --depth 1 https://github.com/tesseract-ocr/tesseract.git
    cd tesseract
    export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig 
    export LIBLEPT_HEADERSDIR=/usr/local/include 
    ./autogen.sh
    ./configure --with-extra-includes=/usr/local/include --with-extra-libraries=/usr/local/lib
    LDFLAGS="-L/usr/local/lib" CFLAGS="-I/usr/local/include" make
    sudo make install
    sudo ldconfig

5.
    cd /usr/local/share/tessdata
    wget https://github.com/tesseract-ocr/tessdata/raw/3.04.00/osd.traineddata
    wget https://github.com/tesseract-ocr/tessdata/raw/4.00/eng.traineddata

# on AMI Image: amzn-ami-hvm-2017.03.1.20170812-x86_64-gp2 (ami-fdb8229e)

6.
    export LDFLAGS=-Wl,-rpath=/var/task/
    sudo yum install tcl-devel libpng-devel libjpeg-devel ghostscript-devel bzip2-devel freetype-devel libtiff-devel
    
    wget http://www.imagemagick.org/download/ImageMagick.tar.gz
    tar -xvf ImageMagick.tar.gz
    cd ImageMagick-7.*
    ./configure --disable-shared --enable-delegate-build --with-png=yes --with-tiff=yes --with-jpeg=yes --with-webp=yes
    make
    sudo make install
    sudo ldconfig /usr/local/lib