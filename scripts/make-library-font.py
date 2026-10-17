"""Original 5x7 plaque lettering. Optional regeneration: python3 scripts/make-library-font.py.
The committed TTF is used at runtime; FontTools is only needed to regenerate it.
Lowercase deliberately shares the small block capitals. Other scripts fall back
through the CSS font stack, so renaming a library never loses Unicode text.
"""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
patterns={
'A':['01110','10001','10001','11111','10001','10001','10001'],
'B':['11110','10001','10001','11110','10001','10001','11110'],
'C':['01111','10000','10000','10000','10000','10000','01111'],
'D':['11110','10001','10001','10001','10001','10001','11110'],
'E':['11111','10000','10000','11110','10000','10000','11111'],
'F':['11111','10000','10000','11110','10000','10000','10000'],
'G':['01111','10000','10000','10111','10001','10001','01111'],
'H':['10001','10001','10001','11111','10001','10001','10001'],
'I':['11111','00100','00100','00100','00100','00100','11111'],
'J':['00111','00010','00010','00010','10010','10010','01100'],
'K':['10001','10010','10100','11000','10100','10010','10001'],
'L':['10000','10000','10000','10000','10000','10000','11111'],
'M':['10001','11011','10101','10101','10001','10001','10001'],
'N':['10001','11001','10101','10011','10001','10001','10001'],
'O':['01110','10001','10001','10001','10001','10001','01110'],
'P':['11110','10001','10001','11110','10000','10000','10000'],
'Q':['01110','10001','10001','10001','10101','10010','01101'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'S':['01111','10000','10000','01110','00001','00001','11110'],
'T':['11111','00100','00100','00100','00100','00100','00100'],
'U':['10001','10001','10001','10001','10001','10001','01110'],
'V':['10001','10001','10001','10001','10001','01010','00100'],
'W':['10001','10001','10001','10101','10101','11011','10001'],
'X':['10001','10001','01010','00100','01010','10001','10001'],
'Y':['10001','10001','01010','00100','00100','00100','00100'],
'Z':['11111','00001','00010','00100','01000','10000','11111'],
' ':['00000']*7,
}
builder=FontBuilder(1000,isTTF=True)
order=['.notdef']+['u'+str(ord(c)) for c in patterns]
builder.setupGlyphOrder(order)
glyphs={}
for c,name in [(None,'.notdef')]+[(c,'u'+str(ord(c))) for c in patterns]:
 pen=TTGlyphPen(None)
 for y,row in enumerate(patterns.get(c,['11111','10001','10101','10101','10101','10001','11111'])):
  for x,value in enumerate(row):
   if value=='1':
    a,b=x*100,(6-y)*100
    pen.moveTo((a,b));pen.lineTo((a,b+100));pen.lineTo((a+100,b+100));pen.lineTo((a+100,b));pen.closePath()
 glyphs[name]=pen.glyph()
builder.setupGlyf(glyphs)
builder.setupHorizontalMetrics({name:(600,0) for name in order})
builder.setupHorizontalHeader(ascent=800,descent=-200)
cmap={ord(c):'u'+str(ord(c)) for c in patterns}
cmap.update({ord(c.lower()):'u'+str(ord(c)) for c in patterns if c.isalpha()})
builder.setupCharacterMap(cmap)
builder.setupNameTable({'familyName':'Library Pixel','styleName':'Regular','uniqueFontIdentifier':'LofiRooms-LibraryPixel-1','fullName':'Library Pixel','psName':'LibraryPixel','version':'Version 1.0'})
builder.setupOS2(sTypoAscender=800,sTypoDescender=-200,usWinAscent=800,usWinDescent=200)
builder.setupPost();builder.setupMaxp()
builder.save(Path(__file__).resolve().parents[1]/'assets/library-pixel.ttf')
