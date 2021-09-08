---
date: 2012-08-15
permalink: 2012/08/15/a-websocket-powered-tic-tac-toe-game-using-ruby-eventmachine--part-1.html
layout: post
title: "A Websocket powered Tic tac toe game using Ruby EventMachine – Part 1"
tags: [Ruby, EventMachine, Websockets]
is_outdated: true

---


Lately I have been fiddling around a bit with websockets. Websocket support is now available in most of the modern browsers and Flash based shims are available for older browsers. Having bi-directional communication stream between server and the browser based client opens up a whole new world of opportunities for dynamic web applications.

Implementing a web-socket server in ruby is fairly easy given the plethora of libraries available. One such useful gem is em-websocket which is essentially an Event-Machine based asynchronous web-socket server.

In this post I present a small tutorial implementing a simple tic-tac-toe game. Though the game will be pretty barebones, I hope it will serve as a good introduction to web-socket api.

In the part-1 we focus primarily on the server-part to which we can communicate from the browser using the javascript console. In later parts we will create a client side frontend and further enhance server side facilities.

First, we ensure that Ruby is installed (I have used ruby-1.9.3 for the tutorial) . eventmachine and em-websocket are available as ruby gems. So installing them is as easy as :
    gem install eventmachine
    gem install em-websocket

To see if em-websocket is working without hassles, run the following minimal web-socket implementation.

{% codeblock lang:ruby %}
require 'eventmachine'
require 'em-websocket'

EventMachine.run {

    EventMachine::WebSocket.start(:host => "0.0.0.0", :port => 8080) do |ws|
        ws.onopen {
          puts "WebSocket connection open"
        }
        ws.onclose {
          puts "Connection closed"
        }
    end
}
{% endcodeblock%}

What this code does is it creates a socket-server which listens at localhost:8080 . Callbacks have been provided for open and close events, so when a client creates a connection or a connection gets closed the associated callbacks print an appropriate message to the terminal.

run the webserver with :

    ruby server.rb

The server should go into an event-loop without any errors. Now fire up your browser’s javascript console (or NodeJS console) and try :

    socket = new WebSocket("ws://localhost:8080")

If all goes well, it should return true and the message “Websocket connection open” should be displayed in the terminal.

So far, so good. But the main purpose of a server is to relay data to the client. How do we do that ? Turns out that is pretty simple too.

{% codeblock lang:ruby %}
EventMachine.run {

    EventMachine::WebSocket.start(:host => "0.0.0.0", :port => 8080) do |ws|
        ws.onopen {
          puts "WebSocket connection open"
          # publish message to the client
          ws.send "Hello Client"
        }

        ws.onclose {
          puts "Connection closed"
        }
    end
}
{% endcodeblock%}

Using the send  method, the server sends data to the client. The client side socket has an onmessage event that enables you to recieve the data.

{% codeblock lang:javascript %}
socket = new WebSocket("ws://localhost:8080");
socket.onmessage = function(msg){
    console.log(msg.data)
}
{% endcodeblock%}

Remember we said something socket being a two-way communication channel. The send message is available on the client too and the message can be received in the server in very similar way :

Let us modify our server to enable it to receive data.
{% codeblock lang:ruby %}
ws.onmessage { |msg|
  puts msg
  ws.send msg
}
{% endcodeblock%}
What it does is, it prints any data that it receives and relays it back to the client. So now if you run in the javascript console :

{% codeblock lang:javascript %}
socket.send("Hello world")
{% endcodeblock%}

You should receive the message back.

Now that we have a basic familiarity with the usage of web-sockets let’s proceed with our game :

The flow of the game is like this : A client, after opening the connection, requests the server to register it. Upon registration, if a free player is available, then he is paired up with this player and game begins. If a player is not free the player is added to a queue and once a new player arrives , they both commence a new game.

For now let us not delve into user-registration and score management and satisfy ourselves with an anonymous player vs player game.

In the simple examples above we have only focussed on a single client at a time. If in response to the actions of a client other players have to be relayed information the situation becomes slightly complex. The typical way to deal with such scenarios is to use a Pub-sub system. While a redis based pub-sub system is an excellent solution, we are not using one here to keep things simple and also we have the advantage that it is priorly known that players will always interact in pairs.

Let us organize our code in an object oriented fashion :

{% codeblock lang:ruby %}
class GameController

  def add_player player
    # if partner is available
    #   pair_up with partner
    # else
    #   enqueue partner
  end

  def pair_up player, partner
    # create a new game
    # appoint one of the player as first, and start the game
  end

  def end_game game, players
    # re-allocate partner if someone is waiting
    # ... call add_player - and a new game proceeds
  end
end

EventMachine.run {
  @gc = GameController.new
  EventMachine::WebSocket.start(:host => "0.0.0.0", :port => 8080) do |ws|

    ws.onmessage do |req|
      req = JSON.parse(req)
      case req['action']
      when 'register'
        player = Player.new ws
        puts "Registering player : #{player.id}"
        @gc.add_player player
        player.notify ({:success => true, :id => player.id})
      end
    end

  end
}
{% endcodeblock%}

In the above example : when we have received a message from the client : we check if it is a request for registration. We have abstracted out the game management facilites in an external GameController class (yet unimplemented) which would take care of managing the users and games.

For the sake of consistency, lets have all client server communications serialized as JSON.

Rather than Running around with socket references, we encapsulate all the functionality of a single client in a player class :

{% codeblock lang:ruby %}
class Player
  attr_accessor :socket
  attr_reader :id
  def initialize ws
    @id = rand(5000)
    @socket = ws
    @score = 0
  end
  def notify msg_hash
    @socket.send JSON.dump msg_hash
  end
end
{% endcodeblock%}

Also, we add a stub for a game class which will take care of managing the game state. The Game class instance would represent a single ongoing game between two opponents.

{% codeblock lang:ruby %}
class Game
  attr_reader :id
  def initialize player1, player2, game_controller
    @id = rand(5000)
    # create initial game state
    # notify the players about the game
    start
  end

  def start
    @players.each do |id, player|
      ws = player.socket
      ws.onmessage do |msg|
        # parse the msg
        # is the user request valid in the current context of the game
        # if yes :
        #   change the state of the game to reflect this
        #   notify the opponent about the changed state
        # if no:
        #   notify the initiator about failure
        # has the game concluded:
        # Declare the winner, if any.
      end
    end
  end
end
{% endcodeblock%}

Now that basic overview of the code is clear, implementing the details is not very difficult. Here is the complete code :

{% codeblock lang:ruby %}
require 'eventmachine'
require 'em-websocket'
require 'json'

class Player
  attr_accessor :score, :socket
  attr_reader :id
  def initialize ws
    @id = rand(5000)
    @socket = ws
    @score = 0
  end
  def notify msg_hash
    @socket.send JSON.dump msg_hash
  end
end

class Game
  attr_reader :id
  def initialize player1, player2, game_controller
    @id = rand(5000)
    @players = {}
    [player1, player2].each do |player|
      @players[player.id] = player
    end
    @game_controller = game_controller
    @state = [[0,0,0],[0,0,0],[0,0,0]]
    @players.each do |id, player|
      player.notify({ :msg => "Game initiated !!!" })
    end
    player1.notify({:msg => "Your turn"})
    player2.notify({:msg => "Opponent's turn"})
    @next_player = player1.id
  end

  def start
    @players.each do |id, player|
      ws = player.socket
      ws.onmessage do |msg|
        puts "Message received : #{msg}"
        msg = JSON.parse msg
        puts "id received : #{msg['id']}"
        puts "players : #{@players.to_json}"
        initiator = @players[msg['id']]

        puts "initiator ===> ", initiator.to_json
        partner = find_partner initiator
        case msg['action']
        when 'move'
          validation_result = validate_move msg
          initiator.notify(validation_result)
          if validation_result[:success]
            update_state msg
            @next_player = partner.id
            update_gamestate partner

            if victorious?
              initiator.notify ({ :msg => "You win" })
              partner.notify({ :msg => "You lose" })
              @game_controller.end_game self, @players
            elsif finished?
              resp = {:msg => "Game Over"}
              initiator.notify resp
              partner.notify resp
              @game_controller.end_game self, @players
            end
          else
            update_gamestate initiator
          end
        end
      end
    end
  end

  def validate_move msg
    res = {:success => true}
    if msg['id'] != @next_player
      res = {:success => false, :error => "Move out of turn"}
    end
    if @state[msg['x']][msg['y']] != 0
      res = {:success => false, :error => "Overrite not allowed"}
    end
    res
  end

  def update_state msg
    @state[msg['x']][msg['y']] = msg['id']
  end

  def update_gamestate player
    player.notify ({:game_state => @state })
  end

  def find_partner player
    @players.each { |id, pl| return pl unless  id == player.id }
  end

  def victorious?
    def teq a,b,c
      a != 0 and a == b and b ==c
    end
    i = 0
    while i < 3
      return true if teq @state[i][0], @state[i][1], @state[i][2]
      return true if teq @state[0][i], @state[1][i], @state[2][i]
      i = i+1
    end

    return true if teq @state[0][0], @state[1][1], @state[2][2]
    return true if teq @state[2][0], @state[1][1], @state[0][2]
    false
  end

  def finished?
    not @state[0].include? (0) and
      not @state[1].include? (0) and
      not  @state[2].include? (0)
  end

end

class GameController

  def initialize
    @games = {}
    @free_players = []
    @engaged_players = []
  end

  def add_player player
    puts "Adding player : #{player.id}"
    partner = @free_players.pop
    if partner.nil?
      @free_players << player
      puts "Putting on wait"
      player.notify ({
        :msg => "You will have to wait till we find a partner for you"
      })
    else
      puts "Pairing up : #{player.id}, #{partner.id}"
      pair_up player, partner
    end
  end

  def pair_up player, partner
    puts "Starting game between player #{player.id} and #{partner.id}"
    game = Game.new player, partner, self
    @games[game.id] = game.id
    game.start
  end

  def end_game game, players
    @games[game.id] = nil
    players.each do |id, player|
      add_player player
    end
  end
end

EventMachine.run {
  @gc = GameController.new
  EventMachine::WebSocket.start(:host => "0.0.0.0", :port => 8080) do |ws|

    ws.onmessage do |req|
      req = JSON.parse(req)
      case req['action']
      when 'register'
        player = Player.new ws
        puts "Registering player : #{player.id}"
        @gc.add_player player
        player.notify ({:success => true, :id => player.id})
      end
    end

  end
}

{% endcodeblock%}

While I have skipped over the details of management of game, I believe the code above is fairly readable.

And yes, I am aware of the several issues with the code above. The most obvious one is that serialized state passed to client contains the id of other player as well. So it is easy to cheat the game.  Apart from this there are several other things I have looked over. What if a player passes in a request that cannot be parsed as JSON ? A malformed request initiates an exception that crashes the whole game.  These issues will be resolved and  a score management system and a front-end will be added in the later parts of the tutorial. So stay tuned.

Here is a snapshot of my Javascript console showing a game in progress :

<img src="/images/game.png" />

As always, feel free to provide your suggestions and to point out errors.
