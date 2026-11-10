// CollisionLab: escenas interactivas para entender cómo detectan choques los juegos.
final int CW=1280, CH=720;
final int FONDO=0xFF0D1420, PANEL=0xFF151F2E, LIENZO=0xFF111B29;
final int BORDE=0xFF2A394C, BLANCO=0xFFF1F3F5, SUAVE=0xFFAEBAC8;
final int CIAN=0xFF48D6C8, ROJO=0xFFF07170, AMBAR=0xFFFFC66D;
final int AZUL=0xFF5D91F2, VERDE=0xFF8ED6A4, LILA=0xFFB89BEA;
PFont fuente, fuenteTitulo, fuenteMono;
Escena[] escenas=new Escena[6];
int activa=0;
boolean mostrarLimites=false, mostrarRayos=false, pantallaCompleta=false;
float rueda=0;
float escalaVista=1,desfaseX=0,desfaseY=0,mouseCanvasX,mouseCanvasY;

void settings(){size(CW,CH,P2D);smooth(4);}
void setup(){
  surface.setTitle("CollisionLab | Laboratorio visual de colisiones");
  frameRate(60);
  fuente=createFont("SansSerif",19,true);
  fuenteTitulo=createFont("SansSerif.bold",33,true);
  fuenteMono=createFont("Monospaced",16,true);
  textFont(fuente);
  escenas[0]=new EscenaInicio(); escenas[1]=new EscenaCirculos();
  escenas[2]=new EscenaAABB(); escenas[3]=new EscenaSAT();
  escenas[4]=new EscenaCCD(); escenas[5]=new EscenaBroadPhase();
  for(int i=0;i<escenas.length;i++)escenas[i].iniciar();
}

void draw(){
  background(FONDO);
  escalaVista=min(width/(float)CW,height/(float)CH);
  desfaseX=(width-CW*escalaVista)*0.5f;desfaseY=(height-CH*escalaVista)*0.5f;
  mouseCanvasX=(mouseX-desfaseX)/escalaVista;mouseCanvasY=(mouseY-desfaseY)/escalaVista;
  pushMatrix();translate(desfaseX,desfaseY);scale(escalaVista);
  dibujarFondo();
  Escena e=escenas[activa];
  e.actualizar();
  dibujarCabecera(e);
  dibujarPanelPrincipal(e);
  e.dibujar();
  dibujarExplicacion(e);
  dibujarControles(e);
  dibujarNavegacion();
  popMatrix();
}

void dibujarFondo(){
  stroke(255,7);strokeWeight(1);
  for(int x=0;x<width;x+=48)line(x,0,x,height);
  for(int y=0;y<height;y+=48)line(0,y,width,y);
  noStroke();
}
void dibujarCabecera(Escena e){
  noStroke();fill(PANEL);rect(0,0,width,124);
  fill(CIAN);rect(48,28,7,52);
  textFont(fuenteMono);textSize(15);fill(CIAN);text("LABORATORIO VISUAL   /   FÍSICA 2D",70,39);
  textFont(fuenteTitulo);textSize(33);fill(BLANCO);text(e.titulo,70,82);
  textFont(fuenteMono);textSize(15);fill(SUAVE);text("ESCENA  "+nf(activa+1,2)+" / 06",1002,39);
  fill(BORDE);rect(1002,55,220,4);fill(CIAN);rect(1002,55,220*(activa+1)/6.0,4);
  textFont(fuenteMono);textSize(12);fill(SUAVE);text("1–6  /  CAMBIAR ESCENA",1002,82);
}
void dibujarPanelPrincipal(Escena e){
  noStroke();fill(LIENZO);rect(48,146,812,458,16);
  stroke(BORDE);strokeWeight(1);noFill();rect(48,146,812,458,16);noStroke();
  fill(AMBAR);textFont(fuenteMono);textSize(13);text(e.etiqueta,72,174);
  fill(BORDE);rect(72,190,764,1);
  noStroke();fill(PANEL);rect(884,146,348,458,16);
  stroke(BORDE);noFill();rect(884,146,348,458,16);noStroke();
}
void dibujarExplicacion(Escena e){
  int x=910,y=180;
  textFont(fuenteMono);textSize(12);fill(CIAN);text("IDEA CLAVE",x,y);
  textFont(fuente);textSize(19);fill(BLANCO);wrap(e.resumen,x,y+30,294,26);
  fill(BORDE);rect(x,y+112,296,1);
  textFont(fuenteMono);textSize(12);fill(AMBAR);text("REGLA",x,y+139);
  noStroke();fill(FONDO);rect(x,y+153,296,64,8);
  textFont(fuenteMono);textSize(17);fill(BLANCO);wrap(e.formula,x+12,y+177,272,22);
  fill(BORDE);rect(x,y+233,296,1);
  e.detalle(x,y+258);
  int c=e.hayChoque()?ROJO:VERDE;
  noStroke();fill(e.hayChoque()?0xFF492D38:0xFF20392F);rect(x,y+389,296,32,9);
  fill(c);textFont(fuenteMono);textSize(15);text(e.hayChoque()?"CONTACTO  ·  SÍ":"CONTACTO  ·  NO",x+14,y+410);
}
void dibujarControles(Escena e){
  fill(SUAVE);textFont(fuenteMono);textSize(14);
  text("PRUEBA  "+e.control,52,628);
  text("TECLAS  H: LÍMITES    X: EXPLICACIÓN    R: REINICIAR    F: PANTALLA",638,628);
}
void dibujarNavegacion(){
  String[] nombres={"VISTA GENERAL","CÍRCULOS","AABB","SAT / OBB","CCD","FILTRADO"};
  float x0=48,w=1184.0/6;
  for(int i=0;i<6;i++){
    float x=x0+i*w;
    noStroke();fill(i==activa?0xFF203344:PANEL);rect(x+2,650,w-4,48,9);
    if(i==activa){fill(CIAN);rect(x+2,650,w-4,3,2);}
    fill(i==activa?CIAN:SUAVE);textFont(fuenteMono);textSize(14);text(nf(i+1,2),x+13,680);
    fill(i==activa?BLANCO:SUAVE);textFont(fuente);textSize(14);text(nombres[i],x+43,680);
  }
}
void wrap(String s,float x,float y,float maxW,float alto){
  String[] palabras=split(s,' ');String linea="";float yy=y;
  for(int i=0;i<palabras.length;i++){
    String prueba=linea.length()==0?palabras[i]:linea+" "+palabras[i];
    if(textWidth(prueba)>maxW&&linea.length()>0){text(linea,x,yy);yy+=alto;linea=palabras[i];}else linea=prueba;
  }
  if(linea.length()>0)text(linea,x,yy);
}
void keyPressed(){
  if(key>='1'&&key<='6')cambiar(key-'1');
  else if(keyCode==RIGHT)cambiar((activa+1)%6);
  else if(keyCode==LEFT)cambiar((activa+5)%6);
  else if(key=='h'||key=='H')mostrarLimites=!mostrarLimites;
  else if(key=='x'||key=='X')mostrarRayos=!mostrarRayos;
  else if(key=='r'||key=='R')escenas[activa].iniciar();
  else if(key=='f'||key=='F'){pantallaCompleta=!pantallaCompleta;if(pantallaCompleta){surface.setSize(displayWidth,displayHeight);surface.setLocation(0,0);}else{surface.setSize(CW,CH);surface.setLocation(40,40);}}
  else escenas[activa].tecla();
}
void cambiar(int n){if(n>=0&&n<escenas.length)activa=n;}
void mousePressed(){float px=(mouseX-desfaseX)/escalaVista,py=(mouseY-desfaseY)/escalaVista;if(py>=650&&py<=700&&px>=48&&px<=1232){cambiar(constrain((int)((px-48)/(1184.0/6)),0,5));return;}escenas[activa].clic();}
void mouseWheel(processing.event.MouseEvent ev){rueda=ev.getCount();escenas[activa].rueda(rueda);}
