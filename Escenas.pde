// Cada escena presenta una sola técnica y una demostración manipulable.
abstract class Escena {
  String titulo,etiqueta,resumen,formula,control;
  abstract void iniciar(); abstract void actualizar(); abstract void dibujar();
  abstract boolean hayChoque(); abstract void detalle(float x,float y);
  void tecla(){} void rueda(float d){if(d==0)return;} void clic(){}
}

class EscenaInicio extends Escena {
  boolean choque;
  EscenaInicio(){titulo="Ver el choque, entender la regla";etiqueta="EMPEZAR AQUÍ  /  SEIS IDEAS EN DOS MINUTOS";resumen="Un juego convierte las formas en una pregunta simple: ¿se cruzan sus límites? Mueve el cursor y observa la respuesta.";formula="LÍMITES  →  PRUEBA  →  RESPUESTA";control="Mueve el cursor en el diagrama.";}
  void iniciar(){}
  void actualizar(){float px=constrain(mouseCanvasX,130,800),py=constrain(mouseCanvasY,440,535);choque=circleVsCircle(px,py,45,690,465,58);}
  boolean hayChoque(){return choque;}
  void dibujar(){
    miniTarjeta(82,218,224,116,"01   CÍRCULOS",CIAN);miniTarjeta(322,218,224,116,"02   CAJAS",AMBAR);miniTarjeta(562,218,224,116,"03   ROTACIÓN",LILA);
    noFill();stroke(CIAN);strokeWeight(3);ellipse(156,278,48,48);ellipse(183,278,48,48);
    stroke(AMBAR);rect(364,255,63,45);rect(411,273,63,45);
    pushMatrix();translate(635,278);rotate(-0.42f);stroke(LILA);rect(-36,-13,72,26);popMatrix();stroke(LILA);triangle(739,252,769,304,709,304);
    float px=constrain(mouseCanvasX,130,800),py=constrain(mouseCanvasY,440,535),cx=690,cy=465,r=58;boolean hit=circleVsCircle(px,py,45,cx,cy,r);
    stroke(hit?ROJO:CIAN);strokeWeight(3);noFill();ellipse(cx,cy,r*2,r*2);fill(hit?ROJO:CIAN);noStroke();ellipse(px,py,90,90);stroke(BLANCO,90);strokeWeight(1);line(px,py,cx,cy);
    if(mostrarLimites){noFill();stroke(hit?ROJO:VERDE);strokeWeight(1);ellipse(cx,cy,r*2,r*2);ellipse(px,py,90,90);}
    fill(BLANCO);textFont(fuenteMono);textSize(13);text("A",cx-5,cy-r-12);text("B",px-4,py+57);
  }
  void detalle(float x,float y){detalleLinea(x,y,"01","Círculos",CIAN);detalleLinea(x,y+37,"02","Rectángulos AABB",AMBAR);detalleLinea(x,y+74,"03","Polígonos SAT",LILA);fill(SUAVE);textFont(fuente);textSize(14);text("Después: velocidad y miles de objetos.",x,y+119);}
}

class EscenaCirculos extends Escena {
  float rJugador=43,rFijo=78,cx=605,cy=375,d;boolean hit;
  EscenaCirculos(){titulo="Círculo contra círculo";etiqueta="01  /  DETECCIÓN GEOMÉTRICA";resumen="Cada objeto se aproxima como un círculo. Compara la distancia entre centros con la suma de los radios.";formula="dx² + dy² < (r₁ + r₂)²";control="Mueve el cursor. Rueda: cambia el radio.";}
  void iniciar(){} void actualizar(){float px=constrain(mouseCanvasX,100,820),py=constrain(mouseCanvasY,220,550);d=dist(px,py,cx,cy);hit=circleVsCircle(px,py,rJugador,cx,cy,rFijo);}
  boolean hayChoque(){return hit;}
  void dibujar(){float px=constrain(mouseCanvasX,100,820),py=constrain(mouseCanvasY,220,550);stroke(BORDE);strokeWeight(1);line(102,cy,820,cy);line(cx,210,cx,555);stroke(hit?ROJO:CIAN);strokeWeight(3);noFill();ellipse(cx,cy,rFijo*2,rFijo*2);stroke(AMBAR);line(cx,cy,cx+rFijo,cy);line(px,py,px+rJugador,py);fill(AMBAR);noStroke();textFont(fuenteMono);textSize(13);text("r₂",cx+rFijo/2,cy-12);text("r₁",px+rJugador/2,py-12);stroke(hit?ROJO:SUAVE);strokeWeight(2);line(px,py,cx,cy);noStroke();fill(hit?ROJO:CIAN);ellipse(px,py,rJugador*2,rJugador*2);fill(FONDO);ellipse(px-10,py-6,8,8);ellipse(px+10,py-6,8,8);fill(BLANCO);ellipse(px-9,py-7,2,2);ellipse(px+11,py-7,2,2);if(mostrarLimites){noFill();stroke(hit?ROJO:VERDE);strokeWeight(1);ellipse(cx,cy,rFijo*2,rFijo*2);ellipse(px,py,rJugador*2,rJugador*2);}}
  void detalle(float x,float y){metric(x,y,"DISTANCIA",nf(d,1,1)+" px");metric(x,y+48,"RADIOS SUMADOS",nf(rJugador+rFijo,1,1)+" px");fill(hit?ROJO:VERDE);textFont(fuenteMono);textSize(13);text("COMPARACIÓN DIRECTA · SIN RAÍZ",x,y+113);}
  void rueda(float d){rJugador=constrain(rJugador-d*3,18,72);}
}

class EscenaAABB extends Escena {
  float w=122,h=86,bx=565,by=354,ax,ay;boolean[] ok=new boolean[4];boolean hit;
  EscenaAABB(){titulo="Cajas alineadas a los ejes";etiqueta="02  /  AABB · CAJA ALINEADA";resumen="Dos cajas chocan si sus intervalos se solapan a la vez en X y en Y.";formula="SOLAPA EN X  Y  SOLAPA EN Y";control="Mueve el cursor. Rueda: tamaño de caja.";}
  void iniciar(){} void actualizar(){ax=constrain(mouseCanvasX-w/2,92,820-w);ay=constrain(mouseCanvasY-h/2,210,490);ok[0]=ax<bx+170;ok[1]=ax+w>bx;ok[2]=ay<by+116;ok[3]=ay+h>by;hit=ok[0]&&ok[1]&&ok[2]&&ok[3];}
  boolean hayChoque(){return hit;}
  void dibujar(){stroke(BORDE);strokeWeight(1);line(104,by+58,820,by+58);line(bx+85,210,bx+85,505);fill(hit?0xFF4D2932:0xFF1B3543);stroke(hit?ROJO:CIAN);strokeWeight(3);rect(bx,by,170,116,4);fill(hit?0xFF49372B:0xFF40392C);stroke(hit?ROJO:AMBAR);rect(ax,ay,w,h,4);fill(BLANCO);noStroke();textFont(fuenteMono);textSize(14);text("A",ax+8,ay+21);text("B",bx+8,by+21);
    fill(SUAVE);textSize(12);text("X",91,531);stroke(BORDE);strokeWeight(8);line(126,526,815,526);stroke(AMBAR);strokeWeight(7);line(ax,526,ax+w,526);stroke(CIAN);line(bx,538,bx+170,538);fill(SUAVE);noStroke();text("Y",91,566);stroke(BORDE);strokeWeight(8);line(105,228,105,492);stroke(AMBAR);strokeWeight(7);line(105,ay,105,ay+h);stroke(CIAN);line(117,by,117,by+116);
    if(mostrarLimites){noFill();stroke(hit?ROJO:VERDE);strokeWeight(1);rect(ax,ay,w,h);rect(bx,by,170,116);}}
  void detalle(float x,float y){String[] s={"A.left < B.right","A.right > B.left","A.top < B.bottom","A.bottom > B.top"};for(int i=0;i<4;i++){fill(ok[i]?VERDE:ROJO);textFont(fuenteMono);textSize(14);text(ok[i]?"✓":"×",x,y+16+i*25);fill(SUAVE);text(s[i],x+22,y+16+i*25);}fill(AMBAR);textFont(fuente);textSize(14);text("Desliza: resuelve X e Y por separado.",x,y+119);}
  void rueda(float d){w=constrain(w-d*8,72,200);h=constrain(h-d*5,54,150);}
}

class EscenaSAT extends Escena {
  float ang=0,ejeX=1,ejeY=0;PVector[] jugador=new PVector[4],tri,hex,objetivo;SATResultado resultado;boolean hit;
  EscenaSAT(){titulo="Polígonos rotados · SAT";etiqueta="03  /  TEOREMA DEL EJE SEPARADOR";resumen="Proyecta ambos polígonos sobre la normal de cada lado. Si un eje separa sus sombras, no chocan.";formula="UN EJE SEPARADO → NO HAY CHOQUE";control="Mueve cursor. Q/E o rueda: rota la caja.";}
  void iniciar(){ang=0;}
  void actualizar(){if(keyPressed&&(key=='q'||key=='Q'))ang-=0.012f;if(keyPressed&&(key=='e'||key=='E'))ang+=0.012f;float px=constrain(mouseCanvasX,130,800),py=constrain(mouseCanvasY,220,510);jugador=rectVertices(px,py,150,66,ang);tri=poligonoRegular(3,365,390,62,-HALF_PI);hex=poligonoRegular(6,665,380,72,0.12f);SATResultado rt=satPolygons(jugador,tri),rh=satPolygons(jugador,hex);hit=rt.colision||rh.colision;if(rt.colision){resultado=rt;objetivo=tri;}else{resultado=rh;objetivo=hex;}ejeX=resultado.eje.x;ejeY=resultado.eje.y;}
  boolean hayChoque(){return hit;}
  void dibujar(){dibujaPoligono(tri,0xFF243A4C,AZUL);dibujaPoligono(hex,hit?0xFF512B35:0xFF243A4C,hit?ROJO:LILA);dibujaPoligono(jugador,hit?0xFF512B35:0xFF1D414A,hit?ROJO:CIAN);
    if(mostrarRayos||hit){float cx=promX(jugador),cy=promY(jugador);stroke(hit?ROJO:AMBAR);strokeWeight(2);line(cx-ejeX*320,cy-ejeY*320,cx+ejeX*320,cy+ejeY*320);dibujaProyeccion(jugador,ejeX,ejeY,520,CIAN);dibujaProyeccion(objetivo,ejeX,ejeY,539,LILA);}
    if(hit){float cx=promX(jugador),cy=promY(jugador),tx=cx+resultado.eje.x*resultado.solape,ty=cy+resultado.eje.y*resultado.solape;stroke(AMBAR);strokeWeight(3);line(cx,cy,tx,ty);flecha(tx,ty,resultado.eje.x,resultado.eje.y,AMBAR);}
    if(mostrarLimites){stroke(VERDE);strokeWeight(1);noFill();drawShape(jugador);drawShape(tri);drawShape(hex);}}
  void detalle(float x,float y){fill(hit?ROJO:VERDE);textFont(fuenteMono);textSize(14);text(hit?"NO HAY EJE SEPARADOR":"HAY EJE SEPARADOR",x,y+17);fill(SUAVE);textFont(fuente);textSize(14);wrap("Se prueban las normales de A y B. Todas deben solaparse.",x,y+47,292,19);textFont(fuenteMono);textSize(13);fill(AMBAR);text(hit?"MTV: EMPUJE MÍNIMO  ·  "+nf(resultado.solape,1,1)+" PX":"SOMBRAS SEPARADAS",x,y+112);}
  void tecla(){if(key=='q'||key=='Q')ang-=0.08f;if(key=='e'||key=='E')ang+=0.08f;}void rueda(float d){ang+=d*0.08f;}
  void dibujaPoligono(PVector[] p,int fc,int sc){fill(fc);stroke(sc);strokeWeight(3);drawShape(p);}
  void dibujaProyeccion(PVector[] p,float nx,float ny,float y,int c){float lo=Float.MAX_VALUE,hi=-Float.MAX_VALUE;for(int i=0;i<p.length;i++){float q=p[i].x*nx+p[i].y*ny;lo=min(lo,q);hi=max(hi,q);}float mid=(lo+hi)*0.5f;stroke(c);strokeWeight(7);line(500+(lo-mid)*0.65f,y,500+(hi-mid)*0.65f,y);}
}

class EscenaCCD extends Escena {
  float x=120,prev=120,vel=27,impactoX=0;final float paredX=640,paredY=278,paredW=7,paredH=190;
  boolean continuo=true,pausa=false,tunel=false,impacto=false;int pasos=0,reloj=0;float[] rastro=new float[6];int[] edad=new int[6];
  EscenaCCD(){titulo="Velocidad y tunneling";etiqueta="04  /  DETECCIÓN CONTINUA · CCD";resumen="Un objeto rápido puede saltar de un lado al otro de una pared entre cuadros. La prueba puntual no alcanza a verlo.";formula="POSICIÓN ANTERIOR → NUEVA";control="TAB: discreta/CCD. Espacio: pausa. N: un cuadro.";}
  void iniciar(){x=120;prev=x;pasos=0;reloj=0;tunel=false;impacto=false;pausa=false;for(int i=0;i<edad.length;i++)edad[i]=0;}
  void actualizar(){if(pausa&&pasos==0)return;pasos=0;if(impacto||tunel){if(++reloj>55)iniciar();return;}prev=x;for(int i=edad.length-1;i>0;i--){rastro[i]=rastro[i-1];edad[i]=edad[i-1];}rastro[0]=x;edad[0]=1;float nuevo=x+vel;Caja amplia=new Caja(paredX-6,paredY-6,paredW+12,paredH+12);
    if(continuo){float t=segmentVsAabb(x,385,nuevo,385,amplia);if(t>=0){x=lerp(x,nuevo,t);impactoX=x;impacto=true;return;}}
    else if(aabbVsAabb(nuevo-6,379,12,12,paredX,paredY,paredW,paredH)){x=nuevo;impacto=true;impactoX=x;return;}
    x=nuevo;if(x>845&&x>paredX+paredW)tunel=true;}
  boolean hayChoque(){return impacto;}
  void dibujar(){stroke(BORDE);strokeWeight(1);for(int i=0;i<8;i++)line(120+i*90,228,120+i*90,520);fill(0xFF5A4935);stroke(AMBAR);strokeWeight(2);rect(paredX-5,paredY,paredW+10,paredH,2);fill(AMBAR);noStroke();rect(paredX-2,paredY+14,paredW+4,4);
    for(int i=edad.length-1;i>=0;i--)if(edad[i]>0){fill(CIAN,55-i*7);ellipse(rastro[i],385,16,16);}stroke(continuo?AMBAR:ROJO);strokeWeight(3);line(prev,385,x,385);noStroke();fill(continuo?CIAN:ROJO);ellipse(x,385,16,16);fill(BLANCO);ellipse(x+2,383,4,4);
    if(mostrarRayos){stroke(AMBAR);strokeWeight(1);line(prev,385,x,385);}if(mostrarLimites){noFill();stroke(hitColor());strokeWeight(1);rect(paredX-6,paredY-6,paredW+12,paredH+12);ellipse(x,385,16,16);}if(tunel)etiquetaEvento("TUNNELING · NO LO DETECTÓ",ROJO);if(impacto){etiquetaEvento("IMPACTO EN EL PUNTO",VERDE);for(int i=0;i<6;i++){stroke(AMBAR);line(impactoX,385,impactoX+cos(i*TWO_PI/6)*18,385+sin(i*TWO_PI/6)*18);}}}
  int hitColor(){return impacto?ROJO:VERDE;}
  void detalle(float x,float y){metric(x,y,"VELOCIDAD / CUADRO",nf(vel,1,0)+" PX");metric(x,y+48,"GROSOR DE PARED",nf(paredW,1,0)+" PX");fill(tunel?ROJO:(continuo?VERDE:ROJO));textFont(fuenteMono);textSize(12);text(tunel?"TUNNELING · LA PRUEBA FALLÓ":(continuo?"REVISA TODO EL SEGMENTO":"REVISA SOLO EL PUNTO"),x,y+114);}
  void tecla(){if(key==TAB)continuo=!continuo;else if(key==' ')pausa=!pausa;else if((key=='n'||key=='N')&&pausa)pasos=1;}
  void clic(){iniciar();}
}

class EscenaBroadPhase extends Escena {
  final int MAX=1500,COLS=10,ROWS=6,CELDAS=COLS*ROWS;
  float[] x=new float[MAX],y=new float[MAX],vx=new float[MAX],vy=new float[MAX];boolean[] marcados=new boolean[MAX];
  int[][] celdas=new int[CELDAS][MAX];int[] totalCelda=new int[CELDAS];int n=760,comparaciones=0;boolean grid=true,hit=false;
  EscenaBroadPhase(){titulo="Filtrar antes de comprobar";etiqueta="05  /  FILTRADO ESPACIAL → PRUEBA EXACTA";resumen="La fuerza bruta compara cada pareja. La rejilla descarta a los objetos que están lejos y deja menos pruebas exactas.";formula="MENOS PAREJAS → MENOS CÁLCULO";control="Rueda o ↑/↓: cantidad. TAB: fuerza bruta/rejilla.";}
  void iniciar(){for(int i=0;i<n;i++)nuevo(i);}void nuevo(int i){x[i]=random(78,828);y[i]=random(214,570);vx[i]=random(-0.48f,0.48f);vy[i]=random(-0.38f,0.38f);}
  void actualizar(){for(int i=0;i<n;i++){marcados[i]=false;x[i]+=vx[i];y[i]+=vy[i];if(x[i]<78||x[i]>828)vx[i]*=-1;if(y[i]<214||y[i]>570)vy[i]*=-1;}comparaciones=0;hit=false;
    if(!grid){for(int a=0;a<n;a++)for(int b=a+1;b<n;b++)probar(a,b);}
    else{for(int c=0;c<CELDAS;c++)totalCelda[c]=0;for(int i=0;i<n;i++){int c=celda(i);celdas[c][totalCelda[c]++]=i;}
      for(int cy=0;cy<ROWS;cy++)for(int cx=0;cx<COLS;cx++){int c=cy*COLS+cx;for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++){int nx=cx+dx,ny=cy+dy;if(nx<0||nx>=COLS||ny<0||ny>=ROWS)continue;int v=ny*COLS+nx;if(v<c)continue;for(int a=0;a<totalCelda[c];a++)for(int b=0;b<totalCelda[v];b++){int ia=celdas[c][a],ib=celdas[v][b];if(v==c&&ib<=ia)continue;probar(ia,ib);}}}}
  }
  int celda(int i){int cx=constrain((int)((x[i]-78)/75),0,COLS-1),cy=constrain((int)((y[i]-210)/61),0,ROWS-1);return cy*COLS+cx;}
  void probar(int a,int b){comparaciones++;if(circleVsCircle(x[a],y[a],3.2f,x[b],y[b],3.2f)){marcados[a]=true;marcados[b]=true;hit=true;}}
  boolean hayChoque(){return hit;}
  void dibujar(){if(grid){if(mostrarRayos){noStroke();for(int c=0;c<CELDAS;c++)if(totalCelda[c]>0){int cx=c%COLS,cy=c/COLS;fill(184,155,234,35);rect(78+cx*75,210+cy*61,75,61);}}stroke(BORDE);strokeWeight(1);for(int i=0;i<=COLS;i++)line(78+i*75,210,78+i*75,576);for(int i=0;i<=ROWS;i++)line(78,210+i*61,828,210+i*61);}for(int i=0;i<n;i++){noStroke();fill(marcados[i]?ROJO:(i%5==0?LILA:CIAN));ellipse(x[i],y[i],marcados[i]?9:6,marcados[i]?9:6);if(mostrarLimites){noFill();stroke(marcados[i]?ROJO:VERDE);strokeWeight(1);ellipse(x[i],y[i],6.4f,6.4f);}}}
  void detalle(float x,float y){metric(x,y,"OBJETOS",nf(n,1,0));metric(x,y+48,"COMPARACIONES",nf(comparaciones,1,0));fill(grid?VERDE:ROJO);textFont(fuenteMono);textSize(13);text(grid?"MODO B · REJILLA":"MODO A · FUERZA BRUTA",x,y+114);}
  void tecla(){if(key==TAB)grid=!grid;if(keyCode==UP)cambiarCantidad(50);if(keyCode==DOWN)cambiarCantidad(-50);}void rueda(float d){cambiarCantidad((int)-d*50);}
  void cambiarCantidad(int d){int antes=n;n=constrain(n+d,100,MAX);for(int i=antes;i<n;i++)nuevo(i);}
}

void miniTarjeta(float x,float y,float w,float h,String titulo,int acento){noStroke();fill(PANEL);rect(x,y,w,h,9);fill(acento);rect(x,y,3,h,2);fill(SUAVE);textFont(fuenteMono);textSize(12);text(titulo,x+13,y+22);}
void detalleLinea(float x,float y,String n,String s,int c){fill(c);textFont(fuenteMono);textSize(13);text(n,x,y+17);fill(SUAVE);textFont(fuente);textSize(14);text(s,x+31,y+17);}
void metric(float x,float y,String label,String value){fill(SUAVE);textFont(fuenteMono);textSize(12);text(label,x,y+15);fill(BLANCO);textFont(fuenteTitulo);textSize(24);text(value,x,y+43);}
void etiquetaEvento(String s,int c){noStroke();fill(FONDO);rect(652,207,182,29,6);fill(c);textFont(fuenteMono);textSize(11);text(s,660,226);}
