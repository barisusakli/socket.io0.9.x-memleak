var  socketio             = require( "socket.io" )
   , express              = require( "express" )
   , http                 = require( "http" )
   , os                   = require( "os" )
   , path                 = require( "path" )
   , cluster              = require( "cluster" )
   , child_process        = require( "child_process" )
   , heapdump             = require( "heapdump" )
   , swig                 = require( "swig" )
   , colors               = require( "colors" )
   , RedisStore            = require( "./node_modules/socket.io/lib/stores/redis" )
   , redis                 = require( "redis" )
   , benchmark;

var pub = redis.createClient(6379, 'localhost');
var sub = redis.createClient(6379, 'localhost');
var store = redis.createClient(6379, 'localhost');
var runs = 0;

pub.select(1);
sub.select(2);
pub.select(3);

var benchmark = function( callback ){
    child_process.exec("ab -p data.json -T 'application/json' \
    -n 30000 -c 100 http://127.0.0.1:4568/", function(error, stdout, stderr){
        console.log( stdout.blue );
        callback();
    });
};

if( cluster.isMaster ){
 var id;
  for( var x = 0 ;x < os.cpus().length; x++ ){
      cluster.fork();
  }

  id = setInterval(function(){

    console.log("**starting apache bench %s**".green.bold, ++runs );
    benchmark(function(){
      if( runs > 9 ) {
        clearInterval( id );
        //process.exit(0);
      }
    });

  },1000 * 10);
} else {
  var app = express();

  var server = http.createServer( app );

  var io = socketio.listen( server, {log:false} );
  io.configure( function(){
    io.enable('browser client minification');
    io.enable('browser client gzip');
  });

  app.configure(function(){
      app.use( '/static', express.static( path.normalize( path.join( __dirname, "static" ) ) ) );
      app.use( express.favicon() );
      app.engine("swig", swig.renderFile);
      app.use(express.json());

      io.set('store', new RedisStore({
        pub:pub
        ,sub:sub
        ,store:store
      }));
      app.set("view engine", "swig");

      app.set('view options', {
        layout: false
      });
  });

  swig.setDefaults({
    root:path.resolve('./views')
    ,allowErrors: true
  });

  app.get('/', function( req, res ){
    res.render('index.swig');
  });

  app.post('/', function( req, res ){
    io.sockets.in('test').emit('message', req.body);
    req.body = null;
    return res.json({success:1});
  });

  io.on('connection', function( socket ){
    console.log("joining test");
    socket.join('test');
    socket.on('sigterm', function(){
      socket.leave( 'test' );
    });
  });

  if (cluster.worker.id === 1) {
    console.log('writing heap ' + process.pid, cluster.worker.id);
    heapdump.writeSnapshot();
    setInterval(function() {
      console.log('writing heap ' + process.pid, cluster.worker.id);
      heapdump.writeSnapshot();
    }, 1000 * 30);
  }

server.listen( 4568 );

setInterval( function(){
  var mem = parseInt( process.memoryUsage().rss / ( 1024 * 1204 ), 10 );
 if( mem < 50 ){
   mem = colors.blue("" + mem )
 } else if( mem > 70 && mem <= 100){
    mem = colors.yellow( "" + mem )
  } else if( mem > 100 && mem < 200 ) {
    mem = ( "" + mem ).yellowBG.black.bold;
  }else if( mem > 200 ){
    mem = ("" + mem ).red.bold;
  } else{
    mem = colors.green( "" + mem );
  }
  console.log(
    "process %s >> %s mb", process.pid, mem
  );
},1000 * 3);
}
