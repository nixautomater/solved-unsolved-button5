# name: discourse-solved-unsolved-button
# about: Add solved and unsolved button to topic on Discourse
# version: 0.4
# authors: Muhlis Budi Cahyono (muhlisbc@gmail.com)
# url: http://git.dev.abylina.com/momon/discourse-solved-unsolved-button

register_asset 'stylesheets/mmn-solved-unsolved-button.scss'

after_initialize {

  # controller
  module ::MmnSolvedQueue
    class Engine < ::Rails::Engine
      engine_name 'mmn_solved_queue'
      isolate_namespace MmnSolvedQueue
    end
  end

  require_dependency "application_controller"
  class MmnSolvedQueue::SolvedController < ::ApplicationController

    def list
      state       = params["state"]
      guardian.ensure_mmn_process_crit!(state)

      topic_ids   = TopicCustomField.where(name: "mmn_queue_state", value: state).pluck(:topic_id)
      topics      = Topic.where(id: topic_ids).order(:bumped_at => :desc).includes(:user).references(:user)
      render_json_dump(serialize_data(topics, TopicListItemSerializer, scope: guardian, root: false))
    end

    def solved
      set_state("solved")
    end

    def unsolved
      set_state("unsolved")
    end

    def is_show_link
      groups = current_user.groups.pluck(:name)
      render json: {
        solved: groups.include?(SiteSetting.solved_group_name_can_process_solved),
        unsolved: groups.include?(SiteSetting.solved_group_name_can_process_unsolved)
      }
    end

    private

    def set_state(button)
      topic = Topic.find(params[:id].to_i)

      guardian.ensure_mmn_queue_crit!(topic, button)

      ["solved_state", "mmn_button_active", "mmn_queue_state"].each do |f|
        topic.custom_fields[f] = params[f]
      end
      topic.save
      render json: topic.custom_fields
    end

  end

  MmnSolvedQueue::Engine.routes.draw do
    get "/list"           => "solved#list"
    post "/solved"        => "solved#solved"
    post "/unsolved"      => "solved#unsolved"
    get "/is_show_link"   => "solved#is_show_link"
  end

  Discourse::Application.routes.append do
    mount ::MmnSolvedQueue::Engine, at: "mmn_solved_queue"
  end

  # guardian
  class ::Guardian

    def mmn_queue_crit?(topic, group)
      allow_accepted_answers_on_category?(topic.category_id) && authenticated? && !topic.closed? && (mmn_is_op?(topic.user_id) || mmn_group_member?(SiteSetting.send("solved_group_name_can_queue_#{group}")))
    end

    def mmn_process_crit?(state)
      authenticated? && mmn_group_member?(SiteSetting.send("solved_group_name_can_process_#{state}"))
    end

    def mmn_is_op?(topic_user_id)
      topic_user_id == current_user.id
    end

    def mmn_group_member?(group_name)
      @mmn_groups ||= current_user.groups.pluck(:name)
      @mmn_groups.include?(group_name)
    end

  end

  # serializers
  require_dependency 'topic_view_serializer'
  class ::TopicViewSerializer
    attributes :solved_state, :mmn_buttons, :solved_show_button

    def solved_state
      #object.topic.custom_fields["solved_state"]
      s_state = object.topic.custom_fields["solved_state"]
      if s_state.blank?
        object.topic.custom_fields["accepted_answer_post_ids"].blank? ? "unsolved" : "solved"
      else
        s_state
      end
    end

    def mmn_buttons
      {
        solved: button_state("solved"),
        unsolved: button_state("unsolved"),
        active: object.topic.custom_fields["mmn_button_active"]
      }
    end

    def button_state(button)
      {
        can_click: scope.mmn_queue_crit?(object.topic, button)
      }
    end

    def solved_show_button
      !solved_state.nil? || scope.allow_accepted_answers_on_category?(object.topic.category_id)
    end
  end

  module ::MmnSolvedCustomHelper
    def self.included(base)
      base.class_eval {
        attributes :solved_state, :user

        def solved_state
          s_state = object.custom_fields["solved_state"]
          if s_state.blank?
            object.custom_fields["accepted_answer_post_ids"].blank? ? "unsolved" : "solved"
          else
            s_state
          end
        end

        def user
          object.user ? object.user.slice(:username, :id, :avatar_template, :name) : {}
        end
      }
    end

    def self.topic_custom_query(is_not = "")
      #"topics.id #{is_not} IN (SELECT tc.topic_id FROM topic_custom_fields tc WHERE (tc.name = 'solved_state' AND tc.value = 'solved') OR (tc.name = 'accepted_answer_post_ids' AND tc.value IS NOT NULL))"
      <<-SQL
        topics.id #{is_not} IN (
          SELECT tc.topic_id FROM topic_custom_fields tc
          WHERE (tc.name = 'solved_state' AND tc.value = 'solved')
          OR
          (
            tc.name = 'accepted_answer_post_ids' AND tc.value IS NOT NULL
            AND
            tc.topic_id
            NOT IN
              (SELECT tc2.topic_id FROM topic_custom_fields tc2 WHERE (tc2.name = 'solved_state' AND tc2.value = 'unsolved'))
          )
        )
      SQL
    end
  end

  require_dependency 'search'

  if Search.respond_to? :advanced_filter
    Search.advanced_filter(/in:solved/) do |posts|
      posts.where(::MmnSolvedCustomHelper.topic_custom_query)
    end

    Search.advanced_filter(/in:unsolved/) do |posts|
      posts.where(::MmnSolvedCustomHelper.topic_custom_query("NOT"))
    end
  end

  if Discourse.has_needed_version?(Discourse::VERSION::STRING, '1.8.0.beta6')
    require_dependency 'topic_query'

    TopicQuery.add_custom_filter(:solved) do |results, topic_query|
      if topic_query.options[:solved] == 'yes'
        results = results.where(::MmnSolvedCustomHelper.topic_custom_query)
      elsif topic_query.options[:solved] == 'no'
        results = results.where(::MmnSolvedCustomHelper.topic_custom_query("NOT"))
      end
      results
    end
  end


  require_dependency 'topic_list_item_serializer'
  require_dependency 'listable_topic_serializer'

  ::TopicListItemSerializer.send(:include, MmnSolvedCustomHelper)
  ::ListableTopicSerializer.send(:include, MmnSolvedCustomHelper)

  TopicList.preloaded_custom_fields << "solved_state" if TopicList.respond_to? :preloaded_custom_fields

  if CategoryList.respond_to?(:preloaded_topic_custom_fields)
    CategoryList.preloaded_topic_custom_fields << "solved_state"
  end

}